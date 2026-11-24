import mongoose from "mongoose";
import { Schema } from "mongoose";

const interestRate = 0.02;

const calculateNoAdhesion = (adhesion, monthlyFee, months) => {
  if (adhesion === 0) return monthlyFee;

  const payment = (adhesion * interestRate) / (1 - Math.pow(1 + interestRate, -months));

  return Number((Math.round((payment + monthlyFee) / 1000) * 1000 - 10).toFixed(2));
};

const calculateAdhesion = (familyAdhesion, accessories, field) => {
  const accessoriesTotal = accessories.reduce((total, accessory) => total + (accessory?.[field] ?? 0), 0);

  return Number(((familyAdhesion ?? 0) + accessoriesTotal).toFixed(2));
};

const linkSchema = new Schema(
  {
    label: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const productsSchema = new Schema(
  {
    accessories: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Accessory" }],
      default: [],
    },
    closure: {
      type: Number,
      required: true,
    },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

productsSchema.virtual("name").get(function () {
  const { baseFamily } = this.parent();

  return [baseFamily.name, ...this.accessories.map(({ name }) => name)].filter(Boolean).join(" ");
});

productsSchema.virtual("code").get(function () {
  const { baseFamily } = this.parent();

  return [baseFamily.code, ...this.accessories.map(({ code }) => code)].filter(Boolean).join("") + new Date().getFullYear();
});

productsSchema.virtual("riskFactor").get(function () {
  const { riskFactor: familyRiskFactor } = this.parent().baseFamily;

  if (familyRiskFactor < 0) return familyRiskFactor;

  const accessoryRiskFactors = this.accessories.map((accessory) => accessory?.riskFactor);

  if (accessoryRiskFactors.some((riskFactor) => riskFactor == null)) return undefined;

  return Math.max(familyRiskFactor, ...accessoryRiskFactors);
});

productsSchema.virtual("sumOfInstallationCost").get(function () {
  const { installationCost: familyCost } = this.parent().baseFamily;
  const accessoryCosts = this.accessories.map((accessory) => accessory?.installationCost);

  if (familyCost == null || accessoryCosts.some((cost) => cost == null)) return undefined;

  return Number(accessoryCosts.reduce((total, cost) => total + cost, familyCost).toFixed(2));
});

productsSchema.virtual("installationCategory").get(function () {
  const installationCost = this.sumOfInstallationCost;

  if (installationCost == null) return undefined;

  if (installationCost <= 0) return 0;
  if (installationCost >= 0 && installationCost <= 10000) return 1;
  if (installationCost > 10000 && installationCost <= 12000) return 2;
  if (installationCost > 12000 && installationCost <= 14000) return 3;
  if (installationCost > 14000 && installationCost <= 16000) return 4;
  if (installationCost > 16000 && installationCost <= 20000) return 5;
  if (installationCost > 20000 && installationCost <= 25000) return 6;
  if (installationCost > 25000 && installationCost <= 30000) return 7;
  if (installationCost > 30000) return 8;
});

productsSchema.virtual("installationTotal").get(function () {
  const installationCost = this.installationCategory;

  if (installationCost == null) return undefined;

  if (installationCost <= 0) return 0;
  if (installationCost === 1) return 10000;
  if (installationCost === 2) return 12000;
  if (installationCost === 3) return 14000;
  if (installationCost === 4) return 16000;
  if (installationCost === 5) return 20000;
  if (installationCost === 6) return 25000;
  if (installationCost === 7) return 30000;
  if (installationCost === 8) return 55000;
});

productsSchema.virtual("productBom").get(function () {
  const { price: familyBomPrice } = this.parent().baseFamily;
  const accessoryPrices = this.accessories.map((accessory) => accessory?.price);

  if (familyBomPrice == null || accessoryPrices.some((price) => price == null)) {
    return undefined;
  }

  return Number(accessoryPrices.reduce((total, price) => total + price, familyBomPrice).toFixed(2));
});

productsSchema.virtual("adhesion").get(function () {
  const cost = this.productBom;
  const installation = this.installationTotal;
  const riskFactor = this.riskFactor;

  if (cost == null || installation == null || riskFactor == null) {
    return undefined;
  }

  const base = (cost + installation) / (1 - riskFactor);

  return Number((Math.round(base / 10000) * 10000 - 10).toFixed(2));
});

productsSchema.virtual("adhesion12months").get(function () {
  return calculateAdhesion(this.parent().baseFamily.adhesion12Months, this.accessories, "adhesion12Months");
});

productsSchema.virtual("adhesion24months").get(function () {
  return calculateAdhesion(this.parent().baseFamily.adhesion24Months, this.accessories, "adhesion24Months");
});

productsSchema.virtual("adhesion36months").get(function () {
  return calculateAdhesion(this.parent().baseFamily.adhesion36Months, this.accessories, "adhesion36Months");
});

productsSchema.virtual("adhesion48months").get(function () {
  return calculateAdhesion(this.parent().baseFamily.adhesion48Months, this.accessories, "adhesion48Months");
});

productsSchema.virtual("adhesion60months").get(function () {
  return calculateAdhesion(this.parent().baseFamily.adhesion60Months, this.accessories, "adhesion60Months");
});

productsSchema.virtual("noAdhesion12months").get(function () {
  return calculateNoAdhesion(this.adhesion, this.adhesion12months, 12);
});

productsSchema.virtual("noAdhesion24months").get(function () {
  return calculateNoAdhesion(this.adhesion, this.adhesion24months, 24);
});

productsSchema.virtual("noAdhesion36months").get(function () {
  return calculateNoAdhesion(this.adhesion, this.adhesion36months, 36);
});

productsSchema.virtual("noAdhesion48months").get(function () {
  return calculateNoAdhesion(this.adhesion, this.adhesion48months, 48);
});

productsSchema.virtual("noAdhesion60months").get(function () {
  return calculateNoAdhesion(this.adhesion, this.adhesion60months, 60);
});

const comboSchema = new Schema(
  {
    baseFamily: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FamilyBom",
      required: true,
    },
    usefulLinks: {
      type: [linkSchema],
      default: [],
    },
    banner: {
      type: String,
      default: null,
    },
    canva: {
      type: String,
      default: null,
    },
    additionalInfo: {
      type: String,
      default: null,
    },
    products: {
      type: [productsSchema],
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

const Combo = mongoose.model("Combo", comboSchema);

export default Combo;

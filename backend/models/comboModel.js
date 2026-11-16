import mongoose from "mongoose";
import { Schema } from "mongoose";

const interestRate = 0.02;

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

  return accessoryCosts.reduce((total, cost) => total + cost, familyCost);
});

productsSchema.virtual("installationCategory").get(function () {
  const installationCost = this.sumOfInstallationCost;

  if (installationCost == null) return undefined;

  if (installationCost <= 0) return 0;
  if (installationCost >= 0 && installationCost <= 100) return 1;
  if (installationCost > 100 && installationCost <= 120) return 2;
  if (installationCost > 120 && installationCost <= 140) return 3;
  if (installationCost > 140 && installationCost <= 160) return 4;
  if (installationCost > 160 && installationCost <= 200) return 5;
  if (installationCost > 200 && installationCost <= 250) return 6;
  if (installationCost > 250 && installationCost <= 300) return 7;
  if (installationCost > 300) return 8;
});

productsSchema.virtual("installationTotal").get(function () {
  const installationCost = this.installationCategory;

  if (installationCost == null) return undefined;

  if (installationCost <= 0) return 0;
  if (installationCost === 1) return 100;
  if (installationCost === 2) return 120;
  if (installationCost === 3) return 140;
  if (installationCost === 4) return 160;
  if (installationCost === 5) return 200;
  if (installationCost === 6) return 250;
  if (installationCost === 7) return 300;
  if (installationCost === 8) return 550;
});

productsSchema.virtual("productBom").get(function () {
  const { price: familyBomPrice } = this.parent().baseFamily;
  const accessoryPrices = this.accessories.map((accessory) => accessory?.price);

  if (familyBomPrice == null || accessoryPrices.some((price) => price == null)) {
    return undefined;
  }

  return accessoryPrices.reduce((total, price) => total + price, familyBomPrice);
});

productsSchema.virtual("adhesion").get(function () {
  const cost = this.productBom;
  const installation = this.installationTotal;
  const riskFactor = this.riskFactor;

  if (cost == null || installation == null || riskFactor == null) {
    return undefined;
  }

  const base = (cost + installation) / (1 - riskFactor);

  return Number((Math.round(base / 100) * 100 - 0.1).toFixed(2));
});

productsSchema.virtual("adhesion12months").get(function () {
  const { adhesion12Months: familyAdhesion } = this.parent().baseFamily;
  const accessoryAdhesions = this.accessories.map((accessory) => accessory?.adhesion12Months);

  if (familyAdhesion == null || accessoryAdhesions.some((adhesion) => adhesion == null)) return undefined;

  return accessoryAdhesions.reduce((total, adhesion) => total + adhesion, familyAdhesion);
});

productsSchema.virtual("adhesion24months").get(function () {
  const { adhesion24Months: familyAdhesion } = this.parent().baseFamily;
  const accessoryAdhesions = this.accessories.map((accessory) => accessory?.adhesion24Months);

  if (familyAdhesion == null || accessoryAdhesions.some((adhesion) => adhesion == null)) return undefined;

  return accessoryAdhesions.reduce((total, adhesion) => total + adhesion, familyAdhesion);
});

productsSchema.virtual("adhesion36months").get(function () {
  const { adhesion36Months: familyAdhesion } = this.parent().baseFamily;
  const accessoryAdhesions = this.accessories.map((accessory) => accessory?.adhesion36Months);

  if (familyAdhesion == null || accessoryAdhesions.some((adhesion) => adhesion == null)) return undefined;

  return accessoryAdhesions.reduce((total, adhesion) => total + adhesion, familyAdhesion);
});

productsSchema.virtual("adhesion48months").get(function () {
  const { adhesion48Months: familyAdhesion } = this.parent().baseFamily;
  const accessoryAdhesions = this.accessories.map((accessory) => accessory?.adhesion48Months);

  if (familyAdhesion == null || accessoryAdhesions.some((adhesion) => adhesion == null)) return undefined;

  return accessoryAdhesions.reduce((total, adhesion) => total + adhesion, familyAdhesion);
});

productsSchema.virtual("adhesion60months").get(function () {
  const { adhesion60Months: familyAdhesion } = this.parent().baseFamily;
  const accessoryAdhesions = this.accessories.map((accessory) => accessory?.adhesion60Months);

  if (familyAdhesion == null || accessoryAdhesions.some((adhesion) => adhesion == null)) return undefined;

  return accessoryAdhesions.reduce((total, adhesion) => total + adhesion, familyAdhesion);
});

productsSchema.virtual("noAdhesion12months").get(function () {
  const familyAdhesion = this.parent().baseFamily.adhesion12Months;
  const accessoriesAdhesion = this.accessories.reduce((total, accessory) => total + accessory.adhesion12Months, 0);
  const adhesion = this.adhesion;
  const months = 12;

  const monthlyFee = familyAdhesion + accessoriesAdhesion;

  return Number((Math.round(((adhesion * interestRate) / (1 - Math.pow(1 + interestRate, -months)) + monthlyFee) / 10) * 10 - 0.1).toFixed(2));
});

productsSchema.virtual("noAdhesion24months").get(function () {
  const familyAdhesion = this.parent().baseFamily.adhesion24Months;
  const accessoriesAdhesion = this.accessories.reduce((total, accessory) => total + accessory.adhesion24Months, 0);
  const adhesion = this.adhesion;
  const months = 24;

  const monthlyFee = familyAdhesion + accessoriesAdhesion;

  return Number((Math.round(((adhesion * interestRate) / (1 - Math.pow(1 + interestRate, -months)) + monthlyFee) / 10) * 10 - 0.1).toFixed(2));
});

productsSchema.virtual("noAdhesion36months").get(function () {
  const familyAdhesion = this.parent().baseFamily.adhesion36Months;
  const accessoriesAdhesion = this.accessories.reduce((total, accessory) => total + accessory.adhesion36Months, 0);
  const adhesion = this.adhesion;
  const months = 36;

  const monthlyFee = familyAdhesion + accessoriesAdhesion;

  return Number((Math.round(((adhesion * interestRate) / (1 - Math.pow(1 + interestRate, -months)) + monthlyFee) / 10) * 10 - 0.1).toFixed(2));
});

productsSchema.virtual("noAdhesion48months").get(function () {
  const familyAdhesion = this.parent().baseFamily.adhesion48Months;
  const accessoriesAdhesion = this.accessories.reduce((total, accessory) => total + accessory.adhesion48Months, 0);
  const adhesion = this.adhesion;
  const months = 48;

  const monthlyFee = familyAdhesion + accessoriesAdhesion;

  return Number((Math.round(((adhesion * interestRate) / (1 - Math.pow(1 + interestRate, -months)) + monthlyFee) / 10) * 10 - 0.1).toFixed(2));
});

productsSchema.virtual("noAdhesion60months").get(function () {
  const familyAdhesion = this.parent().baseFamily.adhesion60Months;
  const accessoriesAdhesion = this.accessories.reduce((total, accessory) => total + accessory.adhesion60Months, 0);
  const adhesion = this.adhesion;
  const months = 60;

  const monthlyFee = familyAdhesion + accessoriesAdhesion;

  return Number((Math.round(((adhesion * interestRate) / (1 - Math.pow(1 + interestRate, -months)) + monthlyFee) / 10) * 10 - 0.1).toFixed(2));
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

comboSchema.virtual("name").get(function () {
  return this.baseFamily.name;
});

comboSchema.virtual("code").get(function () {
  return this.baseFamily.code;
});

comboSchema.virtual("desc").get(function () {
  return this.baseFamily.desc;
});

comboSchema.virtual("familyObservation").get(function () {
  return this.baseFamily.observation;
});

comboSchema.virtual("accessoriesObservations").get(function () {
  return this.products
    .flatMap((product) => product.accessories)
    .map((accessory) => accessory.observation)
    .filter(Boolean);
});

const Combo = mongoose.model("Combo", comboSchema);

export default Combo;

import mongoose from "mongoose";
import { Schema } from "mongoose";

const itemsSchema = new Schema({
  amount: {
    type: Number,
    required: true,
  },
  unit: {
    type: String,
    required: true,
    enum: ["un", "cm", "m", "kit", "sv"],
  },
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
    required: true,
  },
});

const accessorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      match: /^\d+$/,
    },
    desc: {
      type: String,
      required: true,
    },
    banner: {
      type: String,
      default: null,
    },
    observation: {
      type: String,
      default: null,
    },
    items: {
      type: [itemsSchema],
      required: true,
    },
    riskFactor: {
      type: Number,
      required: true,
    },
    adhesion12Months: {
      type: Number,
      default: 0,
    },
    adhesion24Months: {
      type: Number,
      default: 0,
    },
    adhesion36Months: {
      type: Number,
      default: 0,
    },
    adhesion48Months: {
      type: Number,
      default: 0,
    },
    adhesion60Months: {
      type: Number,
      default: 0,
    },
    installationCost: {
      type: Number,
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

accessorySchema.virtual("price").get(function () {
  return Number(this.items.reduce((total, { amount, item }) => total + amount * item.price, 0).toFixed(2));
});

const Accessory = mongoose.model("Accessory", accessorySchema);

export default Accessory;

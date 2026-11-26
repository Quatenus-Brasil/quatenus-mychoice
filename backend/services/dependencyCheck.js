
import Accessory from "../models/accessoryModel.js";
import Combo from "../models/comboModel.js";
import Device from "../models/deviceModel.js";
import FamilyBom from "../models/familyBomModel.js";

const findDependents = async (configs, targetId) => {
  const results = await Promise.all(
    configs.map(async ({ model, field, buildQuery, type, projection = "name", populate, getName }) => {
      const filter = buildQuery ? buildQuery(targetId) : { [field]: targetId };
      const query = model.find(filter).select(projection);

      if (populate) query.populate(populate);

      const docs = await query.lean();
      return docs.map((d) => ({ id: d._id, name: getName ? getName(d) : d.name, type }));
    }),
  );
  return results.flat();
};

const findItemDependents = async (itemId) => {
  return findDependents(
    [
      { model: Accessory, field: "items.item", type: "Acessório" },
      { model: Device, field: "items.item", type: "Dispositivo" },
      { model: FamilyBom, field: "items.item", type: "BOM da Família" },
    ],
    itemId,
  );
};

const findChipDependents = async (chipId) => {
  return findDependents([{ model: FamilyBom, field: "chip", type: "BOM da Família" }], chipId);
};

const findAccessoryDependents = async (accessoryId) => {
  return findDependents(
    [
      { model: FamilyBom, field: "accessories.accessory", type: "BOM da Família" },
      {
        model: Combo,
        field: "products.accessories",
        type: "Combo",
        projection: "baseFamily",
        populate: { path: "baseFamily", select: "name" },
        getName: (combo) => combo.baseFamily?.name,
      },
    ],
    accessoryId,
  );
};

const findDeviceDependents = async (deviceId) => {
  return findDependents(
    [
      {
        model: FamilyBom,
        buildQuery: (id) => ({ $or: [{ device: id }, { altDevice: id }] }),
        type: "BOM da Família",
      },
    ],
    deviceId,
  );
};

const findFamilyBomDependents = async (familyBomId) => {
  return findDependents(
    [
      {
        model: Combo,
        field: "baseFamily",
        type: "Combo",
        projection: "baseFamily",
        populate: { path: "baseFamily", select: "name" },
        getName: (combo) => combo.baseFamily?.name,
      },
    ],
    familyBomId,
  );
};

export { findDependents, findItemDependents, findChipDependents, findAccessoryDependents, findDeviceDependents, findFamilyBomDependents };

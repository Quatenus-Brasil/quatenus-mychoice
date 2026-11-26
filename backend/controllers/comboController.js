import Combo from "../models/comboModel.js";
import { deleteRequestImages, uploadRequestImages } from "../services/openinaryService.js";

const privateCommercialFields = [
  "riskFactor",
  "adhesion12Months",
  "adhesion24Months",
  "adhesion36Months",
  "adhesion48Months",
  "adhesion60Months",
  "installationCost",
  "price",
];

const removeFields = (value, fields) => {
  if (!value) return;

  fields.forEach((field) => {
    delete value[field];
  });
};

const removeItemPrices = (items) => {
  items?.forEach(({ item }) => removeFields(item, ["price"]));
};

const removeAccessoryPrivateFields = (accessory) => {
  if (!accessory) return;

  removeItemPrices(accessory.items);
  removeFields(accessory, privateCommercialFields);
};

const removeDevicePrivateFields = (device) => {
  if (!device) return;

  removeItemPrices(device.items);
  removeFields(device, ["price"]);
};

const removeComboPrivateFields = (combo) => {
  const { baseFamily } = combo;

  if (baseFamily) {
    removeItemPrices(baseFamily.items);
    baseFamily.accessories?.forEach(({ accessory }) => removeAccessoryPrivateFields(accessory));
    removeDevicePrivateFields(baseFamily.device);
    removeDevicePrivateFields(baseFamily.altDevice);
    removeFields(baseFamily.chip, ["price"]);
    removeFields(baseFamily, privateCommercialFields);
  }

  combo.products?.forEach((product) => {
    product.accessories?.forEach(removeAccessoryPrivateFields);
    removeFields(product, ["riskFactor", "sumOfInstallationCost", "productBom"]);
  });
};

const createCombo = async (request, response) => {
  let uploadedImages = {};
  let comboCreated = false;

  try {
    uploadedImages = await uploadRequestImages(request.files, "combo");

    const newCombo = {
      baseFamily: request.body.baseFamily,
      usefulLinks: request.body.usefulLinks,
      banner: request.body.banner,
      canva: request.body.canva,
      additionalInfo: request.body.additionalInfo,
      products: request.body.products,
      createdBy: request.user._id,
      updatedBy: request.user._id,
      ...uploadedImages,
    };

    const combo = await Combo.create(newCombo);
    comboCreated = true;

    await combo.populate("baseFamily products.accessories");

    return response.status(201).json({ success: true, message: "Combo criado com sucesso", result: combo });
  } catch (error) {
    if (!comboCreated) await deleteRequestImages(Object.values(uploadedImages));

    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const findAllCombos = async (request, response) => {
  try {
    const allCombos = await Combo.find({})
      .select("banner")
      .populate({
        path: "baseFamily",
        select: "name code desc",
        populate: [
          {
            path: "accessories.accessory",
            select: "name code",
          },
          {
            path: "device",
            select: "name code",
          },
          {
            path: "altDevice",
            select: "name code",
          },
          {
            path: "chip",
            select: "name code",
          },
        ],
      })
      .populate({
        path: "products.accessories",
        select: "name code",
      })
      .lean();

    return response.status(200).json({ success: true, message: "Todos os combos foram encontrados com sucesso", result: allCombos });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const findComboById = async (request, response) => {
  try {
    const { id } = request.params;

    const combo = await Combo.findById(id)
      .populate({
        path: "baseFamily",
        populate: [
          {
            path: "items.item",
          },
          {
            path: "accessories.accessory",
            populate: {
              path: "items.item",
            },
          },
          {
            path: "device",
            populate: {
              path: "items.item",
            },
          },
          {
            path: "altDevice",
            populate: {
              path: "items.item",
            },
          },
          {
            path: "chip",
          },
        ],
      })
      .populate({
        path: "products.accessories",
        populate: {
          path: "items.item",
        },
      });

    if (!combo) {
      return response.status(404).json({ success: false, message: "Combo não encontrado" });
    }

    const canSeePrivateFields = request.user.admin === true || (request.user.manager === true && request.user.sector === "Suporte & Operações");

    const result = combo.toObject({ virtuals: true });

    if (!canSeePrivateFields) {
      removeComboPrivateFields(result);
    }

    return response.status(200).json({
      success: true,
      message: "Combo encontrado com sucesso",
      result,
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const deleteCombo = async (request, response) => {
  try {
    const { id } = request.params;
    const combo = await Combo.findById(id);

    if (!combo) {
      return response.status(404).json({ success: false, message: "Combo não encontrado" });
    }

    await combo.deleteOne();

    await deleteRequestImages([combo.banner, combo.canva, combo.additionalInfo]);

    return response.status(200).json({ success: true, message: "Combo excluído com sucesso" });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const editCombo = async (request, response) => {
  let uploadedImages = {};
  let comboUpdated = false;

  try {
    const { id } = request.params;

    const currentCombo = await Combo.findById(id);
    if (!currentCombo) {
      return response.status(404).json({ success: false, message: "Combo não encontrado" });
    }

    uploadedImages = await uploadRequestImages(request.files, "combo");

    const updateData = {
      ...request.body,
      ...uploadedImages,
      updatedBy: request.user._id,
    };

    const updatedCombo = await Combo.findByIdAndUpdate(id, updateData, { returnDocument: "after", runValidators: true });

    if (!updatedCombo) {
      await deleteRequestImages(Object.values(uploadedImages));
      return response.status(404).json({ success: false, message: "Combo não encontrado" });
    }

    comboUpdated = true;

    const replacedImages = ["banner", "canva", "additionalInfo"]
      .filter((field) => field in request.body || field in uploadedImages)
      .filter((field) => updatedCombo[field] !== currentCombo[field])
      .map((field) => currentCombo[field]);

    if (replacedImages.length > 0) {
      await deleteRequestImages(replacedImages);
    }

    await updatedCombo.populate("baseFamily products.accessories");

    return response.status(200).json({ success: true, message: "Combo editado com sucesso", result: updatedCombo });
  } catch (error) {
    if (!comboUpdated) await deleteRequestImages(Object.values(uploadedImages));

    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

export { createCombo, findAllCombos, findComboById, deleteCombo, editCombo };

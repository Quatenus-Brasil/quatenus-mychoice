import Combo from "../models/comboModel.js";
import { deleteImage } from "../services/openinaryService.js";

const createCombo = async (request, response) => {
  try {
    const newCombo = {
      baseFamily: request.body.baseFamily,
      usefulLinks: request.body.usefulLinks,
      banner: request.body.banner,
      canva: request.body.canva,
      additionalInfo: request.body.additionalInfo,
      products: request.body.products,
      createdBy: request.user._id,
      updatedBy: request.user._id,
    };

    const combo = await Combo.create(newCombo);

    await combo.populate("baseFamily products.accessories");

    return response.status(201).json({ success: true, message: "Combo criado com sucesso", result: combo });
  } catch (error) {
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

    // TODO: Isso aqui é gambiarra. Pensar em uma forma melhor de lidar com campos sensíveis
    const canSeePrivateFields = request.user.admin === true || (request.user.manager === true && request.user.sector === "Suporte & Operações");

    const result = combo.toObject({ virtuals: true });

    if (!canSeePrivateFields) {
      const fieldsToRemove = ["riskFactor", "sumOfInstallationCost", "productBom", "price"];

      const removePrivateFields = (value) => {
        if (Array.isArray(value)) {
          value.forEach(removePrivateFields);
          return;
        }

        if (!value || typeof value !== "object") return;

        Object.keys(value).forEach((field) => {
          if (fieldsToRemove.includes(field)) {
            delete value[field];
            return;
          }

          removePrivateFields(value[field]);
        });
      };

      removePrivateFields(result);
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

    if (combo.banner) await deleteImage(combo.banner);

    return response.status(200).json({ success: true, message: "Combo excluído com sucesso" });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const editCombo = async (request, response) => {
  try {
    const { id } = request.params;

    const currentCombo = await Combo.findById(id);
    if (!currentCombo) {
      return response.status(404).json({ success: false, message: "Combo não encontrado" });
    }

    if ("banner" in request.body && request.body.banner !== currentCombo.banner && currentCombo.banner) {
      await deleteImage(currentCombo.banner);
    }

    const updateData = {
      ...request.body,
      updatedBy: request.user._id,
    };

    const updatedCombo = await Combo.findByIdAndUpdate(id, updateData, { returnDocument: "after", runValidators: true });

    if (!updatedCombo) {
      return response.status(404).json({ success: false, message: "Combo não encontrado" });
    }

    await updatedCombo.populate("baseFamily products.accessories");

    return response.status(200).json({ success: true, message: "Combo editado com sucesso", result: updatedCombo });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

export { createCombo, findAllCombos, findComboById, deleteCombo, editCombo };

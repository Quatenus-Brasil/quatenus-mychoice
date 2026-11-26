import Accessory from "../models/accessoryModel.js";
import { deleteRequestImages, uploadRequestImages } from "../services/openinaryService.js";
import { findAccessoryDependents } from "../services/dependencyCheck.js";

const createAccessory = async (request, response) => {
  let uploadedImages = {};
  let accessoryCreated = false;

  try {
    uploadedImages = await uploadRequestImages(request.files, "accessory");

    const newAccessory = {
      name: request.body.name,
      code: request.body.code,
      desc: request.body.desc,
      banner: request.body.banner,
      observation: request.body.observation,
      items: request.body.items,
      riskFactor: request.body.riskFactor,
      adhesion12Months: request.body.adhesion12Months,
      adhesion24Months: request.body.adhesion24Months,
      adhesion36Months: request.body.adhesion36Months,
      adhesion48Months: request.body.adhesion48Months,
      adhesion60Months: request.body.adhesion60Months,
      installationCost: request.body.installationCost,
      createdBy: request.user._id,
      updatedBy: request.user._id,
      ...uploadedImages,
    };

    const accessory = await Accessory.create(newAccessory);
    accessoryCreated = true;

    await accessory.populate("items.item");

    return response.status(201).json({ success: true, message: "Acessório criado com sucesso", result: accessory });
  } catch (error) {
    if (!accessoryCreated) await deleteRequestImages(Object.values(uploadedImages));

    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const findAllAccessories = async (request, response) => {
  try {
    
    const allAccessories = await Accessory.find({})
    .select("name code desc banner")
    .lean();

    return response.status(200).json({ success: true, message: "Todos os acessórios foram encontrados com sucesso", result: allAccessories });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const findAccessoryById = async (request, response) => {
  try {
    const { id } = request.params;

    const canSeePrice = request.user.admin === true || request.user.manager === true;

    const accessory = await Accessory.findById(id)
      .populate("items.item", canSeePrice ? "" : "-price")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!accessory) {
      return response.status(404).json({ success: false, message: "Nenhum acessório encontrado" });
    }

    if (!canSeePrice) {
      accessory.installationCost = undefined;
      accessory.riskFactor = undefined;
      accessory.adhesion12Months = undefined;
      accessory.adhesion24Months = undefined;
      accessory.adhesion36Months = undefined;
      accessory.adhesion48Months = undefined;
      accessory.adhesion60Months = undefined;
    }

    return response.status(200).json({ success: true, message: "Acessório encontrado com sucesso", result: accessory.toObject({ virtuals: canSeePrice }) });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const deleteAccessory = async (request, response) => {
  try {
    const { id } = request.params;
    const accessory = await Accessory.findById(id);

    if (!accessory) {
      return response.status(404).json({ success: false, message: "Acessório não encontrado" });
    }

    const dependents = await findAccessoryDependents(id);

    if (dependents.length > 0) {
      return response.status(409).json({
        success: false,
        message: `O acessório "${accessory.name}" não pode ser excluído pois está em uso em ${dependents.length} registro(s).`,
        result: dependents,
      });
    }

    await accessory.deleteOne();

    await deleteRequestImages([accessory.banner]);

    return response.status(200).json({ success: true, message: `O acessório "${accessory.name}" foi excluído com sucesso` });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const editAccessory = async (request, response) => {
  let uploadedImages = {};
  let accessoryUpdated = false;

  try {
    const { id } = request.params;

    const currentAccessory = await Accessory.findById(id);
    if (!currentAccessory) {
      return response.status(404).json({ success: false, message: "Acessório não encontrado" });
    }

    uploadedImages = await uploadRequestImages(request.files, "accessory");

    const updateData = {
      ...request.body,
      ...uploadedImages,
      updatedBy: request.user._id,
    };

    const updatedAccessory = await Accessory.findByIdAndUpdate(id, updateData, { returnDocument: "after", runValidators: true });

    if (!updatedAccessory) {
      await deleteRequestImages(Object.values(uploadedImages));
      return response.status(404).json({ success: false, message: "Acessório não encontrado" });
    }

    accessoryUpdated = true;

    if (("banner" in request.body || "banner" in uploadedImages) && updatedAccessory.banner !== currentAccessory.banner) {
      await deleteRequestImages([currentAccessory.banner]);
    }

    return response.status(200).json({ success: true, message: "Acessório editado", result: updatedAccessory });
  } catch (error) {
    if (!accessoryUpdated) await deleteRequestImages(Object.values(uploadedImages));

    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

export { createAccessory, findAllAccessories, findAccessoryById, deleteAccessory, editAccessory };

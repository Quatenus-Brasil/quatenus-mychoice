import FamilyBom from "../models/familyBomModel.js";
import { findFamilyBomDependents } from "../services/dependencyCheck.js";
import { deleteRequestImages, uploadRequestImages } from "../services/openinaryService.js";

const createFamilyBom = async (request, response) => {
  let uploadedImages = {};
  let familyBomCreated = false;

  try {
    uploadedImages = await uploadRequestImages(request.files, "family-bom");

    const newFamilyBom = {
      name: request.body.name,
      code: request.body.code,
      desc: request.body.desc,
      observation: request.body.observation,
      items: request.body.items,
      accessories: request.body.accessories,
      device: request.body.device,
      activationGuide: request.body.activationGuide,
      altDevice: request.body.altDevice,
      altActivationGuide: request.body.altActivationGuide,
      chip: request.body.chip,
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

    const familyBom = await FamilyBom.create(newFamilyBom);
    familyBomCreated = true;

    return response.status(201).json({ success: true, message: "B.O.M da Família criado com sucesso", result: familyBom });
  } catch (error) {
    if (!familyBomCreated) await deleteRequestImages(Object.values(uploadedImages));

    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const findAllFamiliesBom = async (request, response) => {
  try {
    const allFamiliesBom = await FamilyBom.find({})
      .select("name code desc")
      .populate({
        path: "device",
        select: "name code",
      })
      .populate({
        path: "altDevice",
        select: "name code",
      })
      .populate({
        path: "chip",
        select: "name code",
      })
      .lean();

    return response.status(200).json({ success: true, message: "Todos os B.O.Ms da Família foram encontrados com sucesso", result: allFamiliesBom });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const findFamilyBomById = async (request, response) => {
  try {
    const { id } = request.params;

    const canSeePrice =
      request.user.admin === true ||
      (request.user.manager === true &&
        (request.user.sector === "Suporte & Operações" ||
          request.user.sector === "Direção" ||
          request.user.sector === "Compras" ||
          request.user.sector === "Logística"));

    const familyBom = await FamilyBom.findById(id)
      .populate("items.item", canSeePrice ? "" : "-price")
      .populate({
        path: "accessories.accessory",
        populate: {
          path: "items.item",
          select: canSeePrice ? "" : "-price",
        },
      })
      .populate({
        path: "device",
        populate: {
          path: "items.item",
          select: canSeePrice ? "" : "-price",
        },
      })
      .populate({
        path: "altDevice",
        populate: {
          path: "items.item",
          select: canSeePrice ? "" : "-price",
        },
      })
      .populate("chip", canSeePrice ? "" : "-price")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!familyBom) {
      return response.status(404).json({ success: false, message: "Nenhum B.O.M da Família encontrado" });
    }

    if (!canSeePrice) {
      familyBom.riskFactor = undefined;
      familyBom.adhesion12Months = undefined;
      familyBom.adhesion24Months = undefined;
      familyBom.adhesion36Months = undefined;
      familyBom.adhesion48Months = undefined;
      familyBom.adhesion60Months = undefined;
      familyBom.installationCost = undefined;
      familyBom.accessories.forEach((accessoryEntry) => {
        accessoryEntry.accessory.installationCost = undefined;
        accessoryEntry.accessory.riskFactor = undefined;
        accessoryEntry.accessory.adhesion12Months = undefined;
        accessoryEntry.accessory.adhesion24Months = undefined;
        accessoryEntry.accessory.adhesion36Months = undefined;
        accessoryEntry.accessory.adhesion48Months = undefined;
        accessoryEntry.accessory.adhesion60Months = undefined;
      });
    }

    return response
      .status(200)
      .json({ success: true, message: "B.O.M da Família encontrado com sucesso", result: familyBom.toObject({ virtuals: canSeePrice }) });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const deleteFamilyBom = async (request, response) => {
  try {
    const { id } = request.params;
    const familyBom = await FamilyBom.findById(id);

    if (!familyBom) {
      return response.status(404).json({ success: false, message: "B.O.M da Família não encontrado" });
    }

    const dependents = await findFamilyBomDependents(id);

    if (dependents.length > 0) {
      return response.status(409).json({
        success: false,
        message: `O B.O.M da Família "${familyBom.name}" não pode ser excluído pois está em uso em ${dependents.length} combo(s).`,
        result: dependents,
      });
    }

    await familyBom.deleteOne();
    await deleteRequestImages([familyBom.activationGuide, familyBom.altActivationGuide]);

    return response.status(200).json({ success: true, message: `O B.O.M da Família "${familyBom.name}" foi excluído com sucesso` });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const editFamilyBom = async (request, response) => {
  let uploadedImages = {};
  let familyBomUpdated = false;

  try {
    const { id } = request.params;

    const currentFamilyBom = await FamilyBom.findById(id);
    if (!currentFamilyBom) {
      return response.status(404).json({ success: false, message: "B.O.M da Família não encontrado" });
    }

    uploadedImages = await uploadRequestImages(request.files, "family-bom");

    const updateData = {
      ...request.body,
      ...uploadedImages,
      updatedBy: request.user._id,
    };

    const updatedFamilyBom = await FamilyBom.findByIdAndUpdate(id, updateData, { returnDocument: "after", runValidators: true });

    if (!updatedFamilyBom) {
      await deleteRequestImages(Object.values(uploadedImages));
      return response.status(404).json({ success: false, message: "B.O.M da Família não encontrado" });
    }

    familyBomUpdated = true;

    const replacedImages = ["activationGuide", "altActivationGuide"]
      .filter((field) => field in request.body || field in uploadedImages)
      .filter((field) => updatedFamilyBom[field] !== currentFamilyBom[field])
      .map((field) => currentFamilyBom[field]);

    if (replacedImages.length > 0) {
      await deleteRequestImages(replacedImages);
    }

    return response.status(200).json({ success: true, message: "B.O.M da Família editado", result: updatedFamilyBom });
  } catch (error) {
    if (!familyBomUpdated) await deleteRequestImages(Object.values(uploadedImages));

    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

export { createFamilyBom, findAllFamiliesBom, findFamilyBomById, deleteFamilyBom, editFamilyBom };

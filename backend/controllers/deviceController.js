import Device from "../models/deviceModel.js";
import { deleteRequestImages, uploadRequestImages } from "../services/openinaryService.js";
import { findDeviceDependents } from "../services/dependencyCheck.js";

const createDevice = async (request, response) => {
  let uploadedImages = {};
  let deviceCreated = false;

  try {
    uploadedImages = await uploadRequestImages(request.files, "device");

    const newDevice = {
      name: request.body.name,
      code: request.body.code,
      desc: request.body.desc,
      banner: request.body.banner,
      observation: request.body.observation,
      items: request.body.items,
      createdBy: request.user._id,
      updatedBy: request.user._id,
      ...uploadedImages,
    };

    const device = await Device.create(newDevice);
    deviceCreated = true;

    await device.populate("items.item");

    return response.status(201).json({ success: true, message: "Dispositivo criado com sucesso", result: device });
  } catch (error) {
    if (!deviceCreated) await deleteRequestImages(Object.values(uploadedImages));

    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const findAllDevices = async (request, response) => {
  try {
    const allDevices = await Device.find({}).select("name code desc banner").lean();

    return response.status(200).json({ success: true, message: "Todos os dispositivos foram encontrados com sucesso", result: allDevices });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const findDeviceById = async (request, response) => {
  try {
    const { id } = request.params;

    const canSeePrice = request.user.admin === true || request.user.manager === true;

    const device = await Device.findById(id)
      .populate("items.item", canSeePrice ? "" : "-price")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");
    if (!device) {
      return response.status(404).json({ success: false, message: "Nenhum dispositivo encontrado" });
    }

    return response.status(200).json({ success: true, message: "Dispositivo encontrado com sucesso", result: device.toObject({ virtuals: canSeePrice }) });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const deleteDevice = async (request, response) => {
  try {
    const { id } = request.params;
    const device = await Device.findById(id);

    if (!device) {
      return response.status(404).json({ success: false, message: "Dispositivo não encontrado" });
    }

    const dependents = await findDeviceDependents(id);

    if (dependents.length > 0) {
      return response.status(409).json({
        success: false,
        message: `O dispositivo "${device.name}" não pode ser excluído pois está em uso em ${dependents.length} registro(s).`,
        result: dependents,
      });
    }

    await device.deleteOne();

    await deleteRequestImages([device.banner]);

    return response.status(200).json({ success: true, message: `O dispositivo "${device.name}" foi excluído com sucesso` });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const editDevice = async (request, response) => {
  let uploadedImages = {};
  let deviceUpdated = false;

  try {
    const { id } = request.params;

    const currentDevice = await Device.findById(id);
    if (!currentDevice) {
      return response.status(404).json({ success: false, message: "Dispositivo não encontrado" });
    }

    uploadedImages = await uploadRequestImages(request.files, "device");

    const updateData = {
      ...request.body,
      ...uploadedImages,
      updatedBy: request.user._id,
    };

    const updatedDevice = await Device.findByIdAndUpdate(id, updateData, { returnDocument: "after", runValidators: true });

    if (!updatedDevice) {
      await deleteRequestImages(Object.values(uploadedImages));
      return response.status(404).json({ success: false, message: "Dispositivo não encontrado" });
    }

    deviceUpdated = true;

    if (("banner" in request.body || "banner" in uploadedImages) && updatedDevice.banner !== currentDevice.banner) {
      await deleteRequestImages([currentDevice.banner]);
    }

    return response.status(200).json({ success: true, message: "Dispositivo editado", result: updatedDevice });
  } catch (error) {
    if (!deviceUpdated) await deleteRequestImages(Object.values(uploadedImages));

    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

export { createDevice, findAllDevices, findDeviceById, deleteDevice, editDevice };

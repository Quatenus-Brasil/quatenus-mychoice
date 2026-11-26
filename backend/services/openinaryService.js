import axios from "axios";

const IMAGE_FIELDS = {
  device: ["banner"],
  accessory: ["banner"],
  combo: ["banner", "canva", "additionalInfo"],
  "family-bom": ["activationGuide", "altActivationGuide"],
};

const getImageFolder = (entity, field) => {
  const fields = IMAGE_FIELDS[entity];

  if (!fields?.includes(field)) {
    throw new Error(`Campo de imagem inválido: ${entity}.${field}`);
  }

  return `${entity}/${field}`;
};

const signUpload = async (entity, field) => {
  const folder = getImageFolder(entity, field);

  const response = await axios.post(
    `${process.env.OPENINARY_URL}/api/upload/sign`,
    { folder, expiresIn: 300 },
    { headers: { Authorization: `Bearer ${process.env.OPENINARY_API_KEY}` } },
  );

  return response.data;
};

const getStoragePath = (image) => {
  let path = image;

  try {
    path = new URL(image).pathname;
  } catch {
    // A URL retornada pelo Openinary também pode ser relativa.
  }

  return path.replace(/^\/t\//, "").replace(/^\/+/, "");
};

const deleteImage = async (image) => {
  const storagePath = getStoragePath(image);
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");

  await axios.delete(`${process.env.OPENINARY_URL}/api/storage/${encodedPath}`, {
    headers: { Authorization: `Bearer ${process.env.OPENINARY_API_KEY}` },
  });
};

const uploadImage = async (file, entity, field) => {
  const signed = await signUpload(entity, field);
  const form = new FormData();

  form.append("files", new Blob([file.buffer], { type: file.mimetype }), file.originalname);
  form.append("folder", signed.folder);
  form.append("signature", signed.signature);
  form.append("expires", String(signed.expires));

  const response = await axios.post(`${process.env.OPENINARY_URL}/api/upload`, form);
  const uploaded = response.data.files?.[0];

  if (!uploaded?.url || !uploaded?.path) {
    throw new Error("O Openinary não retornou os dados da imagem enviada");
  }

  return {
    path: uploaded.path,
    url: new URL(uploaded.url, process.env.OPENINARY_URL).toString(),
  };
};

const uploadRequestImages = async (files, entity) => {
  const uploadedImages = {};

  try {
    for (const field of IMAGE_FIELDS[entity]) {
      const file = files?.[field]?.[0];
      if (file) uploadedImages[field] = await uploadImage(file, entity, field);
    }
  } catch (error) {
    await Promise.allSettled(Object.values(uploadedImages).map(({ path }) => deleteImage(path)));
    throw error;
  }

  return Object.fromEntries(Object.entries(uploadedImages).map(([field, image]) => [field, image.url]));
};

const deleteRequestImages = async (images) => {
  const results = await Promise.allSettled(images.filter(Boolean).map(deleteImage));
  const errors = results.filter(({ status }) => status === "rejected");

  errors.forEach(({ reason }) => console.error(`Falha ao excluir imagem do Openinary: ${reason.message}`));
};

export { uploadRequestImages, deleteRequestImages };

import multer from "multer";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const JSON_FIELDS = ["items", "accessories", "products", "usefulLinks"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (_request, file, callback) => {
    if (!IMAGE_TYPES.includes(file.mimetype)) {
      return callback(new Error("O arquivo enviado precisa ser uma imagem JPEG, PNG ou WebP"));
    }

    callback(null, true);
  },
});

const parseMultipartBody = (request, response, next) => {
  try {
    request.body = Object.fromEntries(
      Object.entries(request.body).map(([key, value]) => {
        if (typeof value !== "string") return [key, value];

        const trimmedValue = value.trim();

        if (trimmedValue === "null") return [key, null];

        if (JSON_FIELDS.includes(key)) return [key, JSON.parse(trimmedValue)];

        return [key, value];
      }),
    );

    Object.keys(request.files ?? {}).forEach((field) => {
      if (!Object.hasOwn(request.body, field)) request.body[field] = null;
    });

    next();
  } catch {
    return response.status(400).json({ success: false, message: "Campo JSON inválido no formulário" });
  }
};

const uploadImages = (fields) => {
  const multipartUpload = upload.fields(fields.map((name) => ({ name, maxCount: 1 })));

  return (request, response, next) => {
    multipartUpload(request, response, (error) => {
      if (!error) return parseMultipartBody(request, response, next);

      const message = error instanceof multer.MulterError ? `Erro no upload: ${error.message}` : error.message;
      return response.status(400).json({ success: false, message });
    });
  };
};

export { uploadImages };

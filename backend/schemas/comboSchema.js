import { z } from "zod";

const usefulLinksSchema = z.array(
  z.object({
    label: z.string("Rótulo precisa ser uma String").trim().min(1, "Rótulo é obrigatório"),
    url: z.string("URL precisa ser uma String").trim().min(1, "URL é obrigatória"),
  }),
);
const accessoriesSchema = z.array(z.string("Acessório precisa ser uma String").trim().min(1, "Acessório é obrigatório"));
const productsSchema = z.array(
  z.object({
    accessories: accessoriesSchema,
    closure: z.coerce.number("Fechamento precisa ser um número"),
  }),
);

const createComboSchema = z
  .object({
    baseFamily: z.string("Família base precisa ser uma String").trim().min(1, "Família base é obrigatória"),
    usefulLinks: usefulLinksSchema.optional().default([]),
    banner: z.string("Banner precisa ser uma String").trim().nullable().optional(),
    canva: z.string("Canva precisa ser uma String").trim().nullable().optional(),
    additionalInfo: z.string("Informações adicionais precisam ser uma String").trim().nullable().optional(),
    products: productsSchema
      .element.extend({
        accessories: accessoriesSchema.optional().default([]),
      })
      .array(),
  })
  .strict();

const editComboSchema = z
  .object({
    baseFamily: createComboSchema.shape.baseFamily,
    usefulLinks: usefulLinksSchema,
    banner: createComboSchema.shape.banner,
    canva: createComboSchema.shape.canva,
    additionalInfo: createComboSchema.shape.additionalInfo,
    products: productsSchema,
  })
  .strict()
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Pelo menos um campo deve ser fornecido para atualização",
  });

export { createComboSchema, editComboSchema };
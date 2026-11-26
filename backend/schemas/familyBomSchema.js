import { z } from "zod";

const createFamilyBomSchema = z
  .object({
    name: z.string("Nome precisa ser uma String").trim().min(1, "Nome é obrigatório"),
    code: z.string("Código precisa ser uma String").trim().min(1, "Código é obrigatório"),
    desc: z.string("Descrição precisa ser uma String").trim().min(1, "Descrição é obrigatória"),
    observation: z.string("Observação precisa ser uma String").trim().nullable(),
    items: z.array(
      z.object({
        amount: z.coerce.number("Quantidade precisa ser um número").positive("Quantidade deve ser maior que zero"),
        unit: z.enum(["un", "cm", "m", "kit", "sv"], "Unidade inválida"),
        item: z.string("Item precisa ser uma String").trim().min(1, "Item é obrigatório"),
      }),
    ),
    accessories: z
      .array(
        z.object({
          amount: z.coerce.number("Quantidade precisa ser um número").positive("Quantidade deve ser maior que zero"),
          accessory: z.string("Acessório precisa ser uma String").trim().min(1, "Acessório é obrigatório"),
        }),
      )
      .optional(),
    device: z.string("Dispositivo precisa ser uma String").trim().min(1, "Dispositivo é obrigatório"),
    activationGuide: z.string("Guia de ativação precisa ser uma String").trim().nullable().optional(),
    altDevice: z.string("Dispositivo alternativo precisa ser uma String").trim().nullable(),
    altActivationGuide: z.string("Guia de ativação alternativa precisa ser uma String").trim().nullable().optional(),
    chip: z.string("Chip precisa ser uma String").trim().nullable(),
    riskFactor: z.coerce.number("Fator de risco precisa ser um número"),
    adhesion12Months: z.coerce.number("Adesão 12 meses precisa ser um número").nonnegative("Adesão 12 meses não pode ser negativo"),
    adhesion24Months: z.coerce.number("Adesão 24 meses precisa ser um número").nonnegative("Adesão 24 meses não pode ser negativo"),
    adhesion36Months: z.coerce.number("Adesão 36 meses precisa ser um número").nonnegative("Adesão 36 meses não pode ser negativo"),
    adhesion48Months: z.coerce.number("Adesão 48 meses precisa ser um número").nonnegative("Adesão 48 meses não pode ser negativo"),
    adhesion60Months: z.coerce.number("Adesão 60 meses precisa ser um número").nonnegative("Adesão 60 meses não pode ser negativo"),
    installationCost: z.coerce.number("Custo de instalação precisa ser um número").nonnegative("Custo de instalação não pode ser negativo"),
  })
  .strict();

const editFamilyBomSchema = createFamilyBomSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: "Pelo menos um campo deve ser fornecido para atualização",
});

export { createFamilyBomSchema, editFamilyBomSchema };

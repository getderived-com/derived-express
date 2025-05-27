import { z } from "zod";

export const v_param_id = z.object({
  id: z.coerce.number(),
});

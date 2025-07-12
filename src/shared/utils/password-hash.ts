import bcrypt from "bcryptjs";

//hash password
export const hashPassword = (value: string) => {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(value, salt);
};

//check password
export const checkPassword = (pass: string, hash: string) => {
  return bcrypt.compareSync(pass, hash);
};

import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { sendWelcomeEmail } from "../services/emailService.js";

const createToken = (_id, rememberMe, tokenVersion = 0) => {
  return jwt.sign({ _id, tokenVersion }, process.env.SECRET_JWT, {
    expiresIn: rememberMe ? "30d" : "3d",
  });
};

const createUser = async (request, response) => {
  try {
    const newUser = {
      active: request.body.active,
      name: request.body.name,
      email: request.body.email,
      password: request.body.password,
      sector: request.body.sector,
      admin: request.body.admin,
      manager: request.body.manager,
    };

    const alreadyExists = await User.findOne({ email: newUser.email });

    if (alreadyExists) {
      return response.status(400).json({ success: false, message: "Este email já está em uso" });
    }

    const user = await User.create(newUser);

    try {
      await sendWelcomeEmail(newUser.email, newUser.name, newUser.password);
    } catch (error) {
      console.error("Erro ao enviar email:", error.response?.data?.message || error.message);
    }

    return response.status(201).json({
      success: true,
      message: "Usuário registrado com sucesso",
      result: {
        _id: user._id,
        active: user.active,
        name: user.name,
        email: user.email,
        sector: user.sector,
        admin: user.admin,
        manager: user.manager,
      },
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const login = async (request, response) => {
  try {
    const { email, password, rememberMe } = request.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return response.status(401).json({ success: false, message: "Credenciais inválidas" });
    }

    if (user.active === false) {
      return response.status(403).json({ success: false, message: "Usuário inativo" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return response.status(401).json({ success: false, message: "Credenciais inválidas" });
    }

    const token = createToken(user._id, rememberMe, user.tokenVersion);

    return response.status(200).json({
      success: true,
      message: "Usuário logado com sucesso",
      result: { token, _id: user._id, active: user.active, name: user.name, email: user.email, sector: user.sector, admin: user.admin, manager: user.manager },
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const me = async (request, response) => {
  try {
    const user = await User.findById(request.user._id);
    if (!user) {
      return response.status(404).json({ success: false, message: "Usuário não encontrado" });
    }

    return response.status(200).json({ success: true, message: "Usuário encontrado com sucesso", result: user });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const findAllUsers = async (request, response) => {
  try {
    const allUsers = await User.find({});
    return response.status(200).json({ success: true, message: "Todos os usuários foram encontrados com sucesso", result: allUsers });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const findUserById = async (request, response) => {
  try {
    const { id } = request.params;

    const user = await User.findById(id);
    if (!user) {
      return response.status(404).json({ success: false, message: "Usuário não encontrado" });
    }

    return response.status(200).json({ success: true, message: "Usuário encontrado com sucesso", result: user });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const editUser = async (request, response) => {
  try {
    const { id } = request.params;
    const updateData = { ...request.body };
    const currentUser = await User.findById(id);

    if (!currentUser) {
      return response.status(404).json({ success: false, message: "Usuário não encontrado" });
    }

    if (updateData.email) {
      const alreadyExists = await User.findOne({ email: updateData.email });

      if (alreadyExists && alreadyExists._id.toString() !== id) {
        return response.status(400).json({ success: false, message: "Este email já está em uso por outro usuário" });
      }
    }

    const becomesInactive = currentUser.active && updateData.active === false;
    const losesAdminAccess = currentUser.active && currentUser.admin && updateData.admin === false;

    if (becomesInactive && id === request.user._id) {
      return response.status(400).json({ success: false, message: "Você não pode inativar a própria conta" });
    }

    if (becomesInactive || losesAdminAccess) {
      const remainingAdmins = await User.countDocuments({
        _id: { $ne: id },
        active: true,
        admin: true,
      });

      if (remainingAdmins === 0) {
        return response.status(400).json({ success: false, message: "Não é possível remover o acesso do último administrador ativo" });
      }
    }

    const updateOperation = { $set: updateData };
    const activeChanged = Object.hasOwn(updateData, "active") && updateData.active !== currentUser.active;

    if (updateData.password) {
      const hashedPassword = await bcrypt.hash(updateData.password, 10);
      updateOperation.$set.password = hashedPassword;
    }

    if (updateData.password || activeChanged) {
      updateOperation.$inc = { tokenVersion: 1 };
    }

    const user = await User.findByIdAndUpdate(id, updateOperation, { returnDocument: "after", runValidators: true });

    if (!user) {
      return response.status(404).json({ success: false, message: "Usuário não encontrado" });
    }

    return response.status(200).json({ success: true, message: "Usuário atualizado com sucesso", result: user });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

const changePassword = async (request, response) => {
  try {
    const id = request.user._id;
    const { currentPassword, newPassword } = request.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.status(400).json({ success: false, message: "ID de usuário inválido" });
    }

    const user = await User.findById(id).select("+password");

    if (!user) {
      return response.status(404).json({ success: false, message: "Usuário não encontrado" });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return response.status(401).json({ success: false, message: "Senha atual incorreta" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(id, { $set: { password: hashedPassword }, $inc: { tokenVersion: 1 } });

    return response.status(200).json({ success: true, message: "Senha alterada com sucesso" });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ success: false, message: error.message });
  }
};

export { createUser, login, me, findAllUsers, findUserById, editUser, changePassword };

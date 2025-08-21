// Corrected auth controller logic

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { inngest } from '../inngest/client.js';

export const signup = async (req, res) => {
    const { email, password, skills = [] } = req.body;
    try {
        const userCount = await User.countDocuments();
        const role = userCount === 0 ? 'admin' : 'user';

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({ email, password: hashedPassword, skills, role });

        await inngest.send({
            name: "user/signup",
            data: { email }
        });

        const token = jwt.sign(
            { _id: user._id, role: user.role },
            process.env.JWT_SECRET
        );

        const userResponse = {
            _id: user._id,
            email: user.email,
            role: user.role,
            skills: user.skills,
            createdAt: user.createdAt
        };

        res.json({ user: userResponse, token });

    } catch (error) {
        res.status(500).json({ error: "Signup Failed", details: error.message });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid Credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid Credentials" });
        }

        const token = jwt.sign(
            { _id: user._id, role: user.role },
            process.env.JWT_SECRET
        );

        res.json({ user, token });

    } catch (error) {
        res.status(500).json({ error: "Login Failed", details: error.message });
    }
};

export const logout = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({ error: "Unauthorized" });
            }
        });

        res.json({ message: "Logout successfully" });

    } catch (error) {
        res.status(500).json({ error: "Logout Failed", details: error.message });
    }
};

export const updateUser = async (req, res) => {
    const { skills = [], role, email } = req.body;
    try {
        if (req.user?.role !== "admin") {
            return res.status(403).json({ error: "Forbidden" });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        await User.updateOne(
            { email },
            { skills: skills.length ? skills : user.skills, role }
        );

        return res.json({ message: "User updated successfully" });

    } catch (error) {
        res.status(500).json({ error: "User update failed", details: error.message });
    }
};

// FIX: Renamed this function from getUser to getUsers
export const getUsers = async (req, res) => {
    try {
        if (req.user?.role !== "admin") {
            return res.status(403).json({ error: "Forbidden" });
        }
        const users = await User.find().select("-password");
        return res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Can't get users", details: error.message });
    }
};
/** src/app/admin/register/route.ts */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import { connectToDB } from "@/lib/connectToDB";

export async function POST(req: Request) {
	try {
		await connectToDB();

		const { name, email, password, role } = await req.json();

		if (!name || !email || !password || !role) {
			return NextResponse.json(
				{ message: "Todos los campos son obligatorios" },
				{ status: 400 },
			);
		}

		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return NextResponse.json(
				{ message: "El usuario ya existe" },
				{ status: 400 },
			);
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		const newUser = new User({
			name,
			email,
			password: hashedPassword,
			role,
		});

		await newUser.save();

		return NextResponse.json(
			{ message: "Usuario registrado correctamente" },
			{ status: 201 },
		);
	} catch (error) {
		console.error("Error en registro:", error);
		return NextResponse.json(
			{ message: "Error al registrar usuario" },
			{ status: 500 },
		);
	}
}

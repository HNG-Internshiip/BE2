import serverless from "serverless-http";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { initDB } from "./src/config/db";
import profileRoutes from "./src/routes/profiles.routes";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.use((_req: Request, res: Response, next: NextFunction) => {
	res.setHeader("Access-Control-Allow-Origin", "*");
	next();
});

app.use("/api/profiles", profileRoutes);

app.use((_req: Request, res: Response) => {
	res.status(404).json({ status: "error", message: "Route not found" });
});

// Cached across warm invocations — avoids reconnecting on every request
let dbReady = false;

const wrappedHandler = serverless(app);

export const handler = async (event: any, context: any) => {
	context.callbackWaitsForEmptyEventLoop = false; // critical for pg pool + Lambda
	if (!dbReady) {
		await initDB();
		dbReady = true;
	}
	return wrappedHandler(event, context);
};
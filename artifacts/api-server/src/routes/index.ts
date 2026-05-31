import { Router, type IRouter } from "express";
import healthRouter from "./health";
import labRouter from "./lab";
import payloadsRouter from "./payloads";

const router: IRouter = Router();

router.use(healthRouter);
router.use(payloadsRouter);
router.use(labRouter);

export default router;

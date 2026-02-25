import { router } from "../trpc";
import { leadsRouter } from "./leads";
import { customersRouter } from "./customers";
import { estimatesRouter } from "./estimates";
import { jobsRouter } from "./jobs";
import { ticketsRouter } from "./tickets";
import { inventoryRouter } from "./inventory";
import { dashboardRouter } from "./dashboard";
import { tasksRouter } from "./tasks";
import { usersRouter } from "./users";

export const appRouter = router({
  leads: leadsRouter,
  customers: customersRouter,
  estimates: estimatesRouter,
  jobs: jobsRouter,
  tickets: ticketsRouter,
  inventory: inventoryRouter,
  dashboard: dashboardRouter,
  tasks: tasksRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;

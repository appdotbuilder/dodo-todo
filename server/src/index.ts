
import { initTRPC, TRPCError } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import {
  createTodoInputSchema,
  updateTodoInputSchema,
  deleteTodoInputSchema,
  signUpInputSchema,
  signInInputSchema,
  createCheckoutInputSchema,
  webhookEventSchema,
} from './schema';
import { createTodo } from './handlers/create_todo';
import { getTodos } from './handlers/get_todos';
import { updateTodo } from './handlers/update_todo';
import { deleteTodo } from './handlers/delete_todo';
import { signUp } from './handlers/sign_up';
import { signIn } from './handlers/sign_in';
import { getCurrentUser } from './handlers/get_current_user';
import { signOut } from './handlers/sign_out';
import { createCheckout } from './handlers/create_checkout';
import { createCustomerPortal } from './handlers/create_customer_portal';
import { handleWebhook } from './handlers/handle_webhook';
import { getSubscription } from './handlers/get_subscription';
import type { IncomingMessage, ServerResponse } from 'http';

// Define context type
interface Context {
  req: IncomingMessage;
  res: ServerResponse;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

// Middleware to authenticate users
const authMiddleware = t.middleware(async ({ next, ctx }) => {
  const authHeader = ctx.req.headers?.authorization;
  if (!authHeader) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No authentication token provided' });
  }

  const token = authHeader.replace('Bearer ', '');
  const user = await getCurrentUser(token);
  
  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }

  return next({
    ctx: {
      ...ctx,
      user,
      sessionToken: token,
    },
  });
});

const authenticatedProcedure = publicProcedure.use(authMiddleware);

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  signUp: publicProcedure
    .input(signUpInputSchema)
    .mutation(({ input }) => signUp(input)),

  signIn: publicProcedure
    .input(signInInputSchema)
    .mutation(({ input }) => signIn(input)),

  signOut: authenticatedProcedure
    .mutation(({ ctx }) => signOut(ctx.sessionToken)),

  getCurrentUser: authenticatedProcedure
    .query(({ ctx }) => ctx.user),

  // Todo routes
  createTodo: authenticatedProcedure
    .input(createTodoInputSchema)
    .mutation(({ input, ctx }) => createTodo(input, ctx.user.id)),

  getTodos: authenticatedProcedure
    .query(({ ctx }) => getTodos(ctx.user.id)),

  updateTodo: authenticatedProcedure
    .input(updateTodoInputSchema)
    .mutation(({ input, ctx }) => updateTodo(input, ctx.user.id)),

  deleteTodo: authenticatedProcedure
    .input(deleteTodoInputSchema)
    .mutation(({ input, ctx }) => deleteTodo(input, ctx.user.id)),

  // Payment routes
  createCheckout: authenticatedProcedure
    .input(createCheckoutInputSchema)
    .mutation(({ input, ctx }) => createCheckout(input, ctx.user.id)),

  createCustomerPortal: authenticatedProcedure
    .mutation(({ ctx }) => createCustomerPortal(ctx.user.id)),

  getSubscription: authenticatedProcedure
    .query(({ ctx }) => getSubscription(ctx.user.id)),

  // Webhook route (public for Dodo Payments)
  handleWebhook: publicProcedure
    .input(webhookEventSchema)
    .mutation(({ input }) => handleWebhook(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors({
        origin: process.env['CLIENT_URL'] || 'http://localhost:3000',
        credentials: true,
      })(req, res, next);
    },
    router: appRouter,
    createContext({ req, res }): Context {
      return { req, res };
    },
  });
  
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
  console.log(`Webhook endpoint: http://localhost:${port}/api/auth/dodopayments/webhooks`);
}

start().catch(console.error);

// my-app/utils/trpc.ts
import { createTRPCReact } from '@trpc/react-query';

import type { AppRouter } from 'backend/src/server/router';

export const trpc = createTRPCReact<AppRouter>();

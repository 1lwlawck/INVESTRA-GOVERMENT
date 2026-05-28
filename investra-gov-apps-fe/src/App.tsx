import { RouterProvider } from 'react-router-dom';
import { router } from '@/routes/index';
import { AuthBootstrap } from '@/core/auth/AuthBootstrap';

export default function App() {
  return (
    <>
      <AuthBootstrap />
      <RouterProvider router={router} />
    </>
  );
}

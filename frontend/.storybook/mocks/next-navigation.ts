/**
 * Mock for next/navigation used in Storybook
 * This allows components using useRouter, usePathname, etc. to work in Storybook
 */

export const useRouter = () => ({
  push: (path: string) => console.log('[Storybook] router.push:', path),
  replace: (path: string) => console.log('[Storybook] router.replace:', path),
  prefetch: () => Promise.resolve(),
  back: () => console.log('[Storybook] router.back'),
  forward: () => console.log('[Storybook] router.forward'),
  refresh: () => console.log('[Storybook] router.refresh'),
});

export const usePathname = () => '/';

export const useSearchParams = () => new URLSearchParams();

export const useParams = () => ({});

export const notFound = () => {
  console.log('[Storybook] notFound called');
};

export const redirect = (path: string) => {
  console.log('[Storybook] redirect:', path);
};

// Re-export Link as a simple anchor for Storybook
export { default as Link } from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // This wraps auth pages in a clean container, 
    // overriding the parent layout's flex-grow wrapper.
    // The lamp-scene itself is full-viewport, so we just pass through.
    <>{children}</>
  );
}

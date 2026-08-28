import { Link } from "@tanstack/react-router";

export function NotFound() {
  return (
    <main className="page flex min-h-[80dvh] flex-col items-center justify-center py-24 text-center">
      <div className="glass glass-spec max-w-lg rounded-[32px] px-8 py-10">
        <p className="kicker">404</p>
        <h1 className="mt-4 text-5xl md:text-7xl">Out of focus.</h1>
        <p className="mt-5 text-muted">That plate is not on the table. The instrument is still here.</p>
        <Link to="/" className="btn mt-8">
          Return to the light table
        </Link>
      </div>
    </main>
  );
}

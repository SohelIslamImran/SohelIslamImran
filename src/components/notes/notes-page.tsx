import { fieldNotes } from "@/data/folio";
import { Viewfinder } from "./viewfinder";

export function NotesPage({ notes = fieldNotes }: { notes?: typeof fieldNotes }) {
  return (
    <main className="page pt-28 pb-24 md:pt-36">
      <p className="kicker">Travel journal · Camera lucida</p>
      <h1 className="mt-4 max-w-3xl text-5xl md:text-7xl">A place for the journeys still ahead.</h1>
      <p className="mt-5 max-w-xl text-lg text-muted">
        One origin. Local observations. Empty plates for trips that have not happened. No invented pins.
      </p>
      <p className="kicker mt-10">Drag the glass · arrows · or the filmstrip</p>
      <div className="mt-6">
        <Viewfinder notes={[...notes]} />
      </div>
    </main>
  );
}

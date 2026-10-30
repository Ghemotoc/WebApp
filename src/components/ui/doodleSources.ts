/**
 * The doodle files the app has copied from design/assets/ so far (story S1-E3-01; the seasonal
 * ones, from bee to sunny face, came with S1-E11-11).
 *
 * Who uses it: Doodle (src/components/ui/Doodle.tsx). Add a line here, and the file to
 * src/assets/doodles/ with a readable name, when a screen needs another doodle. Kept apart from
 * the component so that file exports only a component (React's fast refresh asks for it).
 */
import autumnLeaf from '@/assets/doodles/autumn-leaf.svg';
import bee from '@/assets/doodles/bee.svg';
import booksAndPlant from '@/assets/doodles/books-and-plant.svg';
import butterfly from '@/assets/doodles/butterfly.svg';
import candle from '@/assets/doodles/candle.svg';
import cherryBlossom from '@/assets/doodles/cherry-blossom.svg';
import croissant from '@/assets/doodles/croissant.svg';
import daisy from '@/assets/doodles/daisy.svg';
import deskLamp from '@/assets/doodles/desk-lamp.svg';
import fountainPen from '@/assets/doodles/fountain-pen.svg';
import friendlyGhost from '@/assets/doodles/friendly-ghost.svg';
import heartBalloon from '@/assets/doodles/heart-balloon.svg';
import hotAirBalloon from '@/assets/doodles/hot-air-balloon.svg';
import hotChocolate from '@/assets/doodles/hot-chocolate.svg';
import ideasNotepad from '@/assets/doodles/ideas-notepad.svg';
import jackOLantern from '@/assets/doodles/jack-o-lantern.svg';
import kite from '@/assets/doodles/kite.svg';
import mug from '@/assets/doodles/mug.svg';
import mushroom from '@/assets/doodles/mushroom.svg';
import musicNotes from '@/assets/doodles/music-notes.svg';
import onceUponATime from '@/assets/doodles/once-upon-a-time.svg';
import openBook from '@/assets/doodles/open-book.svg';
import openSpiralNotebook from '@/assets/doodles/open-spiral-notebook.svg';
import owlReadingGlasses from '@/assets/doodles/owl-reading-glasses.svg';
import pencilCup from '@/assets/doodles/pencil-cup.svg';
import rainCloud from '@/assets/doodles/rain-cloud.svg';
import rainbow from '@/assets/doodles/rainbow.svg';
import rocket from '@/assets/doodles/rocket.svg';
import sleepingCat from '@/assets/doodles/sleeping-cat.svg';
import sunnyFace from '@/assets/doodles/sunny-face.svg';
import toteBagOfBooks from '@/assets/doodles/tote-bag-of-books.svg';
import typewriter from '@/assets/doodles/typewriter.svg';

/** Each doodle's name and the file it comes from. */
export const doodleSources = {
  'autumn-leaf': autumnLeaf,
  bee,
  'books-and-plant': booksAndPlant,
  butterfly,
  candle,
  'cherry-blossom': cherryBlossom,
  croissant,
  daisy,
  'desk-lamp': deskLamp,
  'fountain-pen': fountainPen,
  'friendly-ghost': friendlyGhost,
  'heart-balloon': heartBalloon,
  'hot-air-balloon': hotAirBalloon,
  'hot-chocolate': hotChocolate,
  'ideas-notepad': ideasNotepad,
  'jack-o-lantern': jackOLantern,
  kite,
  mug,
  mushroom,
  'music-notes': musicNotes,
  'once-upon-a-time': onceUponATime,
  'open-book': openBook,
  'open-spiral-notebook': openSpiralNotebook,
  'owl-reading-glasses': owlReadingGlasses,
  'pencil-cup': pencilCup,
  'rain-cloud': rainCloud,
  rainbow,
  rocket,
  'sleeping-cat': sleepingCat,
  'sunny-face': sunnyFace,
  'tote-bag-of-books': toteBagOfBooks,
  typewriter,
} as const;

/** One of the copied doodles. */
export type DoodleName = keyof typeof doodleSources;

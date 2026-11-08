/**
 * The doodle files the app has copied from design/assets/ so far (story S1-E3-01; the seasonal
 * ones, from bee to sunny face, came with S1-E11-11; the four rank stickers and the trophy with
 * S1-E8-09; the jar lantern and the three "Why write here" doodles with LOOK-2; the thirteen from the
 * puppy to the map with LOOK-5; the teacup with LOOK-6).
 *
 * Who uses it: the staff pickers that still choose a doodle (forum places, seasonal occasions; G12
 * retires them) and the /design page. Screens draw no doodles since bundle G4. Add a line here, and the file to
 * src/assets/doodles/ with a readable name, when a screen needs another doodle. Kept apart from
 * the component so that file exports only a component (React's fast refresh asks for it).
 */
import autumnLeaf from '@/assets/doodles/autumn-leaf.svg';
import bee from '@/assets/doodles/bee.svg';
import booksAndPlant from '@/assets/doodles/books-and-plant.svg';
import bunny from '@/assets/doodles/bunny.svg';
import butterfly from '@/assets/doodles/butterfly.svg';
import candle from '@/assets/doodles/candle.svg';
import cherryBlossom from '@/assets/doodles/cherry-blossom.svg';
import cloudAndMoon from '@/assets/doodles/cloud-and-moon.svg';
import croissant from '@/assets/doodles/croissant.svg';
import crystalBall from '@/assets/doodles/crystal-ball.svg';
import daisy from '@/assets/doodles/daisy.svg';
import deskLamp from '@/assets/doodles/desk-lamp.svg';
import fountainPen from '@/assets/doodles/fountain-pen.svg';
import fox from '@/assets/doodles/fox.svg';
import friendlyGhost from '@/assets/doodles/friendly-ghost.svg';
import heartBalloon from '@/assets/doodles/heart-balloon.svg';
import hotAirBalloon from '@/assets/doodles/hot-air-balloon.svg';
import hotChocolate from '@/assets/doodles/hot-chocolate.svg';
import ideasNotepad from '@/assets/doodles/ideas-notepad.svg';
import jackOLantern from '@/assets/doodles/jack-o-lantern.svg';
import jarLantern from '@/assets/doodles/jar-lantern.svg';
import kite from '@/assets/doodles/kite.svg';
import littleBird from '@/assets/doodles/little-bird.svg';
import magicWand from '@/assets/doodles/magic-wand.svg';
import magnifyingGlass from '@/assets/doodles/magnifying-glass.svg';
import map from '@/assets/doodles/map.svg';
import medal from '@/assets/doodles/medal.svg';
import mug from '@/assets/doodles/mug.svg';
import mushroom from '@/assets/doodles/mushroom.svg';
import musicNotes from '@/assets/doodles/music-notes.svg';
import onceUponATime from '@/assets/doodles/once-upon-a-time.svg';
import openBook from '@/assets/doodles/open-book.svg';
import openSpiralNotebook from '@/assets/doodles/open-spiral-notebook.svg';
import owlReadingGlasses from '@/assets/doodles/owl-reading-glasses.svg';
import padlock from '@/assets/doodles/padlock.svg';
import peekingPuppy from '@/assets/doodles/peeking-puppy.svg';
import pencilCup from '@/assets/doodles/pencil-cup.svg';
import rainCloud from '@/assets/doodles/rain-cloud.svg';
import rainbow from '@/assets/doodles/rainbow.svg';
import rankCrown from '@/assets/doodles/rank-crown.svg';
import rankOpenBookSparkles from '@/assets/doodles/rank-open-book-sparkles.svg';
import rankPencil from '@/assets/doodles/rank-pencil.svg';
import rankQuillAndInk from '@/assets/doodles/rank-quill-and-ink.svg';
import readingGlasses from '@/assets/doodles/reading-glasses.svg';
import rocket from '@/assets/doodles/rocket.svg';
import scroll from '@/assets/doodles/scroll.svg';
import shieldWithHeart from '@/assets/doodles/shield-with-heart.svg';
import sleepingCat from '@/assets/doodles/sleeping-cat.svg';
import smilingHeart from '@/assets/doodles/smiling-heart.svg';
import snail from '@/assets/doodles/snail.svg';
import sunnyFace from '@/assets/doodles/sunny-face.svg';
import teacup from '@/assets/doodles/teacup.svg';
import toteBagOfBooks from '@/assets/doodles/tote-bag-of-books.svg';
import trophy from '@/assets/doodles/trophy.svg';
import twoChatBubbles from '@/assets/doodles/two-chat-bubbles.svg';
import typewriter from '@/assets/doodles/typewriter.svg';

/** Each doodle's name and the file it comes from. */
export const doodleSources = {
  'autumn-leaf': autumnLeaf,
  bee,
  'books-and-plant': booksAndPlant,
  bunny,
  butterfly,
  candle,
  'cherry-blossom': cherryBlossom,
  'cloud-and-moon': cloudAndMoon,
  croissant,
  'crystal-ball': crystalBall,
  daisy,
  'desk-lamp': deskLamp,
  'fountain-pen': fountainPen,
  fox,
  'friendly-ghost': friendlyGhost,
  'heart-balloon': heartBalloon,
  'hot-air-balloon': hotAirBalloon,
  'hot-chocolate': hotChocolate,
  'ideas-notepad': ideasNotepad,
  'jack-o-lantern': jackOLantern,
  'jar-lantern': jarLantern,
  kite,
  'little-bird': littleBird,
  'magic-wand': magicWand,
  'magnifying-glass': magnifyingGlass,
  map,
  medal,
  mug,
  mushroom,
  'music-notes': musicNotes,
  'once-upon-a-time': onceUponATime,
  'open-book': openBook,
  'open-spiral-notebook': openSpiralNotebook,
  'owl-reading-glasses': owlReadingGlasses,
  padlock,
  'peeking-puppy': peekingPuppy,
  'pencil-cup': pencilCup,
  'rain-cloud': rainCloud,
  rainbow,
  'rank-crown': rankCrown,
  'rank-open-book-sparkles': rankOpenBookSparkles,
  'rank-pencil': rankPencil,
  'rank-quill-and-ink': rankQuillAndInk,
  'reading-glasses': readingGlasses,
  rocket,
  scroll,
  'shield-with-heart': shieldWithHeart,
  'sleeping-cat': sleepingCat,
  'smiling-heart': smilingHeart,
  snail,
  'sunny-face': sunnyFace,
  teacup,
  'tote-bag-of-books': toteBagOfBooks,
  trophy,
  'two-chat-bubbles': twoChatBubbles,
  typewriter,
} as const;

/** One of the copied doodles. */
export type DoodleName = keyof typeof doodleSources;

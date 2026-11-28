"""Build the English non-fiction pack from Standard Ebooks (CC0), for the Non-fiction category.

Robert, 27 Nov 2026: "Now that we have non-fiction, you can try to find some non-fiction to add".
Every work passes the 2026 rule (author died 1955 or earlier, published before 1931), and every
translator died long before 1955 (each year below). Works whose translator's death year could not
be checked are left out (Aristotle by F. H. Peters, Boethius by H. R. James, Augustine by Dods,
Wilson and Smith).

Usage: python3 -I build_nonfiction_pack.py <out.jsonl.gz>
"""
import gzip, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import convert_se  # noqa: E402
from mdtools import group_small  # noqa: E402

RAW = os.path.join(os.path.dirname(HERE), "nonfic", "raw")

# path, title, author, died, first published, kind, category, rating, original language,
# translator, translator died, blurb
WORKS = [
    ("marcus-aurelius/meditations/george-long", "Meditations", "Marcus Aurelius", 180, 180, "essay", "nonfiction_essays", "13_plus", "el", "George Long", 1879,
     "The private notebook of a Roman emperor, reminding himself how to stay calm, fair and humble while ruling an empire at war."),
    ("henry-david-thoreau/walden", "Walden", "Henry David Thoreau", 1862, 1854, "essay", "nonfiction_essays", "13_plus", None, None, None,
     "Thoreau spends two years in a cabin he built by Walden Pond and asks how little a person needs to live well."),
    ("plato/dialogues/benjamin-jowett", "Dialogues", "Plato", -347, -380, "essay", "nonfiction_essays", "13_plus", "el", "Benjamin Jowett", 1893,
     "Socrates questions the people of Athens about justice, love, courage and the soul, from his trial to his last day."),
    ("laozi/tao-te-ching/james-legge", "Tao Te Ching", "Laozi", -400, -400, "essay", "nonfiction_essays", "13_plus", "zh", "James Legge", 1897,
     "Eighty-one short chapters on the Way: yielding, simplicity and leading by not forcing, the founding text of Taoism."),
    ("kahlil-gibran/the-prophet", "The Prophet", "Kahlil Gibran", 1931, 1923, "poem", "poetry", "13_plus", None, None, None,
     "Before he sails home, the prophet Almustafa answers the townspeople's questions on love, work, children, joy and death."),
    ("ralph-waldo-emerson/essays", "Essays", "Ralph Waldo Emerson", 1882, 1841, "essay", "nonfiction_essays", "13_plus", None, None, None,
     "Emerson's two series of essays, including Self-Reliance, on trusting your own mind against custom and the crowd."),
    ("benjamin-franklin/the-autobiography-of-benjamin-franklin", "The Autobiography of Benjamin Franklin", "Benjamin Franklin", 1790, 1791, "essay", "nonfiction_essays", "13_plus", None, None, None,
     "A runaway printer's apprentice tells how he became a publisher, inventor and statesman, and his plan for thirteen virtues."),
    ("charles-darwin/the-origin-of-species", "On the Origin of Species", "Charles Darwin", 1882, 1859, "essay", "nonfiction_essays", "13_plus", None, None, None,
     "Darwin sets out the evidence that species change over time through natural selection, the book that founded modern biology."),
    ("charles-darwin/the-voyage-of-the-beagle", "The Voyage of the Beagle", "Charles Darwin", 1882, 1839, "essay", "nonfiction_essays", "13_plus", None, None, None,
     "A young Darwin's five-year voyage round the world: South American plains, volcanoes, coral reefs and the Galápagos."),
    ("karl-marx_friedrich-engels/the-communist-manifesto/samuel-moore", "The Communist Manifesto", "Karl Marx and Friedrich Engels", 1895, 1848, "essay", "nonfiction_essays", "13_plus", "de", "Samuel Moore", 1911,
     "The short pamphlet of 1848 that called on the workers of the world to unite, and changed the politics of the century after."),
    ("friedrich-nietzsche/beyond-good-and-evil/helen-zimmern", "Beyond Good and Evil", "Friedrich Nietzsche", 1900, 1886, "essay", "nonfiction_essays", "16_plus", "de", "Helen Zimmern", 1934,
     "Nietzsche attacks the hidden assumptions of philosophers and the morality of his time, and asks what a free spirit would value."),
    ("friedrich-nietzsche/thus-spake-zarathustra/thomas-common", "Thus Spake Zarathustra", "Friedrich Nietzsche", 1900, 1883, "essay", "nonfiction_essays", "16_plus", "de", "Thomas Common", 1919,
     "The prophet Zarathustra comes down from his mountain to teach the Übermensch, in Nietzsche's most poetic book."),
    ("epictetus/discourses/george-long", "Discourses", "Epictetus", 135, 108, "essay", "nonfiction_essays", "13_plus", "el", "George Long", 1879,
     "A former slave turned teacher shows his students how to tell what is in their power from what is not, the heart of Stoicism."),
    ("epictetus/short-works/george-long", "The Enchiridion and Fragments", "Epictetus", 135, 125, "essay", "nonfiction_essays", "13_plus", "el", "George Long", 1879,
     "The Stoic handbook: short, practical rules for keeping your peace of mind, whatever happens to you."),
    ("seneca/dialogues/aubrey-stewart", "Dialogues", "Seneca", 65, 49, "essay", "nonfiction_essays", "13_plus", "la", "Aubrey Stewart", 1918,
     "Seneca's essays on anger, the shortness of life, peace of mind and the happy life, written for friends and family."),
    ("niccolo-machiavelli/the-prince/w-k-marriott", "The Prince", "Niccolò Machiavelli", 1527, 1532, "essay", "nonfiction_essays", "13_plus", "it", "W. K. Marriott", 1927,
     "Machiavelli's blunt handbook on how rulers win power and keep it, written for the Medici after he lost his post in Florence."),
    ("john-stuart-mill/on-liberty", "On Liberty", "John Stuart Mill", 1873, 1859, "essay", "nonfiction_essays", "13_plus", None, None, None,
     "Mill argues that society may limit a person's freedom only to stop harm to others, and defends free speech without exception."),
    ("david-hume/an-enquiry-concerning-human-understanding", "An Enquiry Concerning Human Understanding", "David Hume", 1776, 1748, "essay", "nonfiction_essays", "13_plus", None, None, None,
     "Hume asks what we can really know, and finds that cause and effect, and even the self, rest on habit rather than reason."),
    ("thomas-hobbes/leviathan", "Leviathan", "Thomas Hobbes", 1679, 1651, "essay", "nonfiction_essays", "13_plus", None, None, None,
     "Written after the English Civil War, Hobbes's case that without a strong state life would be solitary, poor, nasty, brutish and short."),
    ("william-james/pragmatism", "Pragmatism", "William James", 1910, 1907, "essay", "nonfiction_essays", "13_plus", None, None, None,
     "William James's lectures on judging ideas by what difference they make in practice, the founding book of American pragmatism."),
    ("william-james/the-varieties-of-religious-experience", "The Varieties of Religious Experience", "William James", 1910, 1902, "essay", "nonfiction_essays", "13_plus", None, None, None,
     "A psychologist studies conversions, mystical states and saints from first-hand accounts, without taking sides on belief."),
    ("rene-descartes/philosophical-works/john-veitch", "Discourse on Method and Meditations", "René Descartes", 1650, 1637, "essay", "nonfiction_essays", "13_plus", "fr", "John Veitch", 1894,
     "Descartes doubts everything he can, until he reaches the one thing he cannot doubt: I think, therefore I am."),
    ("alexander-hamilton_john-jay_james-madison/the-federalist-papers", "The Federalist Papers", "Alexander Hamilton, James Madison and John Jay", 1836, 1788, "essay", "nonfiction_essays", "13_plus", None, None, None,
     "Eighty-five newspaper essays urging New Yorkers to ratify the new United States Constitution, and explaining how it works."),
    ("edmund-burke/reflections-on-the-revolution-in-france", "Reflections on the Revolution in France", "Edmund Burke", 1797, 1790, "essay", "nonfiction_essays", "13_plus", None, None, None,
     "Burke warns, early in the French Revolution, that tearing down old institutions at once leads to terror, the founding text of conservatism."),
    ("john-locke/two-treatises-of-government", "Two Treatises of Government", "John Locke", 1704, 1689, "essay", "nonfiction_essays", "13_plus", None, None, None,
     "Locke argues that people have natural rights to life, liberty and property, and may replace a government that breaks its trust."),
    ("thucydides/history-of-the-peloponnesian-war/richard-crawley", "History of the Peloponnesian War", "Thucydides", -400, -400, "essay", "nonfiction_essays", "16_plus", "el", "Richard Crawley", 1893,
     "An Athenian general's account of the long war between Athens and Sparta, with the speeches, plague and massacres that ended a golden age."),
    ("herodotus/histories/g-c-macaulay", "The Histories", "Herodotus", -425, -430, "essay", "nonfiction_essays", "13_plus", "el", "G. C. Macaulay", 1915,
     "The first history book: the Persian Wars, with travellers' tales of Egypt, Scythia and Babylon along the way."),
    ("confucius/analects/james-legge", "The Analects", "Confucius", -479, -400, "essay", "nonfiction_essays", "13_plus", "zh", "James Legge", 1897,
     "The sayings of Confucius, gathered by his students, on how to be a good person, a good friend and a good ruler."),
    ("leo-tolstoy/a-confession/aylmer-maude", "A Confession", "Leo Tolstoy", 1910, 1882, "essay", "nonfiction_essays", "13_plus", "ru", "Aylmer Maude", 1938,
     "At the height of his fame, the author of War and Peace finds his life meaningless and tells how he searched for a reason to go on."),
    ("adam-smith/the-wealth-of-nations", "The Wealth of Nations", "Adam Smith", 1790, 1776, "essay", "nonfiction_essays", "13_plus", None, None, None,
     "Adam Smith explains how the division of labour, free markets and trade make nations rich, the founding book of economics."),
    ("cicero/tusculan-disputations/c-d-yonge", "Tusculan Disputations", "Cicero", -43, -45, "essay", "nonfiction_essays", "13_plus", "la", "C. D. Yonge", 1891,
     "After his daughter's death, Cicero writes five conversations on facing death, pain, grief and fear, and on what makes life happy."),
    ("mary-wollstonecraft/a-vindication-of-the-rights-of-woman", "A Vindication of the Rights of Woman", "Mary Wollstonecraft", 1797, 1792, "essay", "nonfiction_essays", "13_plus", None, None, None,
     "Wollstonecraft argues that women only seem less rational than men because they are denied an education, and demands it for them."),
    ("frederick-douglass/narrative-of-the-life-of-frederick-douglass", "Narrative of the Life of Frederick Douglass", "Frederick Douglass", 1895, 1845, "essay", "nonfiction_essays", "16_plus", None, None, None,
     "Frederick Douglass tells how he was born into slavery in Maryland, taught himself to read and escaped to freedom."),
]


# The database keeps years from 1 to 2100 (classic_authors.died_year, classic_works.first_published_year),
# so works from before year 1 wait until it can store years BC.
# Works from before year 1 (negative years are BC, BC-YEARS, 28 Nov 2026) go in their own pack,
# works-ancient, so they load only on a database that already has the BC-YEARS migration.
ANCIENT = [work for work in WORKS if work[3] < 1 or work[4] < 1]
if os.environ.get("PACK") == "ancient":
    WORKS = ANCIENT
else:
    WORKS = [work for work in WORKS if work not in ANCIENT]


def check(work):
    """Stop on anything the database would refuse or that looks broken."""
    assert work["chapters"], work["id"]
    for chapter in work["chapters"]:
        assert chapter["body"].strip(), f"{work['id']}: empty chapter {chapter['title']}"
        assert len(chapter["body"]) <= 100_000, f"{work['id']}: {chapter['title']} too long"
        assert len(chapter["title"]) <= 120
        assert not re.search(r"<\s*[a-z/!]", chapter["body"]), f"{work['id']}: raw HTML in {chapter['title']}"
        assert "Standard Ebooks" not in chapter["body"], f"{work['id']}: SE text in {chapter['title']}"


# Plato's Dialogues come as one book of 24 dialogues. Readers look for one dialogue (The Republic,
# the Symposium), so each becomes a work of its own, with Jowett's introduction as its first chapter.
# (title on the shelf, rating, SEO blurb)
PLATO_DIALOGUES = {
    "Charmides": ("Charmides", "13_plus", "Socrates and the young Charmides ask what self-control really is, and find every easy answer falls apart."),
    "Lysis": ("Lysis", "13_plus", "Socrates talks with two boys in a wrestling school about friendship: who is a friend, and why we love anyone at all."),
    "Laches": ("Laches", "13_plus", "Two Athenian generals try to define courage for Socrates, and discover they cannot say what they practise."),
    "Protagoras": ("Protagoras", "13_plus", "Socrates takes on the most famous teacher in Greece over whether goodness can be taught at all."),
    "Euthydemus": ("Euthydemus", "13_plus", "Two showy brothers dazzle a crowd with word tricks, and Socrates shows the difference between winning an argument and seeking wisdom."),
    "Cratylus": ("Cratylus", "13_plus", "Are names natural or just agreed on? Socrates plays with Greek words to ask how language fits the world."),
    "Phaedrus": ("Phaedrus", "13_plus", "Under a plane tree outside Athens, Socrates talks of love, the soul as a winged chariot and the dangers of writing."),
    "Ion": ("Ion", "13_plus", "Socrates questions a prize-winning reciter of Homer: is a poet's gift skill, or divine madness?"),
    "Symposium": ("Symposium", "16_plus", "At a drinking party in Athens, guests take turns praising love, from Aristophanes' split humans to Socrates' ladder of beauty."),
    "Meno": ("Meno", "13_plus", "Can virtue be taught? Socrates leads an enslaved boy to a geometry proof to argue that learning is remembering."),
    "Euthyphro": ("Euthyphro", "13_plus", "On his way to his own trial, Socrates meets a man prosecuting his father and asks him what piety really is."),
    "Apology": ("Apology", "13_plus", "Socrates' defence speech at the trial that sentenced him to death for corrupting the young of Athens."),
    "Crito": ("Crito", "13_plus", "In prison awaiting execution, Socrates refuses his friend's plan of escape and explains why he must obey the law."),
    "Phaedo": ("Phaedo", "13_plus", "On the day he drinks the hemlock, Socrates argues with his friends that the soul cannot die."),
    "Gorgias": ("Gorgias", "13_plus", "Socrates against the orators: is power and pleasure the good life, or is it better to suffer wrong than to do it?"),
    "Republic": ("The Republic", "13_plus", "Plato's great dialogue on justice and the ideal city, with philosopher kings and the allegory of the cave."),
    "Timaeus": ("Timaeus", "13_plus", "An account of how the universe was made, the elements, the human body and the first telling of Atlantis."),
    "Critias": ("Critias", "13_plus", "The unfinished story of Atlantis, the island empire that went to war with ancient Athens and sank into the sea."),
    "Parmenides": ("Parmenides", "13_plus", "The young Socrates meets the great Parmenides, who tears apart his theory of forms in a dazzling contest of logic."),
    "Theaetetus": ("Theaetetus", "13_plus", "Socrates and a gifted young mathematician try to answer one question: what is knowledge?"),
    "Sophist": ("Sophist", "13_plus", "A stranger from Elea hunts down the sophist and asks how anyone can say what is not."),
    "Statesman": ("Statesman", "13_plus", "What makes a true ruler? A dialogue on kingship, law and the weaving together of a city."),
    "Philebus": ("Philebus", "13_plus", "Is the good life one of pleasure or of wisdom? Socrates weighs the two and looks for the right mix."),
    "Laws": ("Laws", "13_plus", "Plato's last and longest work: three old men walking in Crete design the laws of a new city from the ground up."),
}


def split_plato(work):
    """Turn the one Dialogues book into a work per dialogue, using the 'Dialogue, ...' title prefix."""
    groups = {}
    for chapter in work["chapters"]:
        dialogue, _, rest = chapter["title"].partition(", ")
        # Step 1: drop the dialogue's name where the chapter title repeats it ("Laws, Book I").
        for repeat in (f"{dialogue}: ", f"{dialogue}, ", f"The {dialogue}, ", f"The {dialogue}: "):
            if rest.startswith(repeat):
                rest = rest[len(repeat):]
        if rest in (dialogue, f"The {dialogue}") or rest.startswith("Or, "):
            rest = "Text"
        if rest.startswith(dialogue + " (part"):
            rest = "Text" + rest[len(dialogue):]
        groups.setdefault(dialogue, []).append(dict(title=rest, body=chapter["body"]))
    assert set(groups) == set(PLATO_DIALOGUES), set(groups) ^ set(PLATO_DIALOGUES)
    works = []
    for dialogue, chapters in groups.items():
        title, rating, blurb = PLATO_DIALOGUES[dialogue]
        works.append(dict(work, id="en-plato-" + dialogue.lower(), title=title, rating=rating, blurb=blurb,
                          chapters=chapters))
    return works


def main(out_path):
    works = []
    for (path, title, author, died, year, kind, category, rating, original, translator, translator_died, blurb) in WORKS:
        html = os.path.join(RAW, path.replace("/", "_") + ".html")
        chapters = convert_se.convert(html, title)
        # Step 1: sections without headings (The Prophet) take their title from the section id.
        if all(chapter_title == title for chapter_title, _ in chapters):
            ids = re.findall(r'<article[^>]*id="([a-z0-9-]+)"[^>]*bodymatter', open(html, encoding="utf-8").read())
            if len(ids) == len(chapters):
                chapters = [(name.replace("-", " ").capitalize(), body) for name, (_, body) in zip(ids, chapters)]
        # Step 2: tidy titles (stray spaces before stops, word joiners), then join runs of tiny
        # sections (aphorisms, short chapters) into readable chapters of about 30,000 characters.
        chapters = [(re.sub(r"\s+([.,;:])", r"\1", t).replace("\u2060", "").rstrip(" ."), b) for t, b in chapters]
        chapters = [(t[:120], b) for t, b in group_small(chapters)]
        work = dict(id="en-" + re.sub(r"[^a-z0-9]+", "-", title.lower().replace("'", "")).strip("-"),
                    title=title, author=author, author_died=died, language="en", kind=kind, category=category,
                    rating=rating, first_published=year, blurb=blurb, source_title="Standard Ebooks (CC0)",
                    source_url="https://standardebooks.org/ebooks/" + path,
                    chapters=[dict(title=t, body=b) for t, b in chapters])
        if original:
            work.update(original_language=original, translator_name=translator,
                        translator_died_year=translator_died, translation_rights="public_domain")
        for each in (split_plato(work) if author == "Plato" else [work]):
            check(each)
            sizes = [len(c["body"]) for c in each["chapters"]]
            print(f"{each['id']}: {len(sizes)} ch, {sum(sizes):,} chars, longest {max(sizes):,}; "
                  f"{[c['title'] for c in each['chapters']]!r}"[:400])
            works.append(each)
    with gzip.open(out_path, "wt", encoding="utf-8") as out:
        for work in works:
            out.write(json.dumps(work, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main(sys.argv[1])

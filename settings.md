# The School From Scratch — Website Settings

Every setting the website uses lives in this file. The website reads only the grey code blocks; everything else (like this text) is notes for people, so write notes anywhere you like.

How to edit:

- Each setting looks like `NAME = value`, inside a code block (between lines of three backticks).
- Numbers are plain (`80`). Text and colors go in quotes (`"#ffffff"`).
- Save this file, then reload the page to see the change.
- If a code block has a mistake, just that block is skipped and its settings fall back to the built-in defaults (the browser console says which block).
- Settings only load when the site is served (on localhost or online), not when index.html is opened straight from the folder.

Sizes are in screen pixels at normal zoom. 96 pixels is about 1 inch.

## Gallery on / off

- `true` = the photo landscape: photos all around the menu, drag to move, zoom in and out, and the menu bar across the top.
- `false` = a plain, normal webpage: just the title and menu, centered, with no photos, no dragging, no zooming, and no menu bar.

(Type true or false with no quotes.)

```js
GALLERY_ENABLED = true
```

How visitors move around the photo landscape:

- `"read"` = a normal scrolling webpage: the browser scrolls it like any other site (mouse wheel, middle-click, scrollbar, keys, swiping on a phone). No dragging, no sideways movement, no zooming.
- `"explore"` = move in any direction by dragging, arrow keys, or swiping, and zoom in and out with the mouse wheel or a pinch.

```js
GALLERY_MODE = "read"
```

## The RSVP emails

When someone RSVPs on the play's page, two emails go out: one to whoever is
running the show, and one back to the person who wrote in. This is what they
say and how they look. (Who they go to, and the address they come from, are
set in the Cloudflare dashboard rather than here, because the key that sends
them must not sit in a file anyone can read.)

These stand in for the details, and are filled in when the email is sent:

- `{show}` — the show's name
- `{seats}` — "1 seat" or "3 seats", worded to suit
- `{count}` — just the number
- `{email}` — the address the person gave

Write the wording between the slanted quote marks (`` ` ``), as ordinary
text. An empty line starts a new paragraph.

```js
RSVP_EMAIL_TO_YOU_SUBJECT = "RSVP: {seats} for {show}"
RSVP_EMAIL_TO_YOU_BODY = `A new RSVP for {show}.

Email: {email}
Seats: {count}

Reply to this message to answer them directly.`

RSVP_EMAIL_TO_THEM_SUBJECT = "Your RSVP for '{show}'"
RSVP_EMAIL_TO_THEM_BODY = `Your RSVP is in. Thank you!

We have put you down for {seats} at {show}.

The School From Scratch`
```

The font and the size of the writing, in pixels. An email program uses a
font the reader already has rather than fetching one, so this is a list of
names to try, ending in something every machine has — `serif` or
`sans-serif`. A font from Google Fonts will not arrive in an email.

```js
RSVP_EMAIL_FONT = "Georgia, 'Times New Roman', serif"
RSVP_EMAIL_TEXT_SIZE = 18
```

A picture under the words, and how wide it is in pixels. Leave it empty ("")
for none.

Write the whole path from the top of the site, folder and all, exactly as
the file is named: `"assets/wooden_airplane.jpg"`, not `"wooden_airplane"`.
It is sent as a link back to the site, so anything that isn't the real path
is simply a broken picture in the email, and nothing here will say so.

Some email programs don't show pictures until the reader asks them to, so
nothing important should live only in the picture.

```js
RSVP_EMAIL_IMAGE = "assets/person_icon_high_quality.png"
RSVP_EMAIL_IMAGE_WIDTH = 140
```

### Scrolling

Whether the browser's scrollbar shows down the side of the window, on every
page of the site. `false` hides it; the page still scrolls exactly as it
did, by wheel, trackpad, arrow keys, Page Down, Home and End, and by swiping
on a phone. (Phones and newer Macs hide it until you scroll anyway, so this
mostly shows up on Windows.)

```js
SHOW_SCROLLBAR = false
```

Read mode: how far above the Home position you can scroll, in pixels.
0 = the top of the page is where Home takes you.

```js
READ_MODE_SCROLL_ABOVE_HOME = 0
```

Read mode: how far below the last section the page may be scrolled, in
pixels. 0 stops the page as soon as the last section ends; 1200 leaves a
screenful or so of thinning photos after it. The page never runs on past
the point where the photos have faded out altogether.

```js
READ_MODE_SCROLL_BELOW_SECTIONS = 400
```

A line of words to end the page with, a little above the bottom of the
scroll, after the last section and the photos. Leave it empty ("") for none.
It's written like the section files, so the wording is yours to shape:
*italic*, **bold**, ***both***. Its size is in pixels, and so is how far
above the bottom of the page it sits.

// --Maxwell // I removed the quote but if anyone wants to add it back this is the one I chose: '*There is no end to education. It isn’t that you read a book and pass an examination, and then finish with education. You think you have finished with it. You have not. The whole of life—from now, from the moment you are born till the moment you die, it’s a process of learning.*' —Jiddu Krishnamurti, Rishi Valley, 1 February 1966

```js
END_QUOTE = ""
END_QUOTE_SIZE = 24
END_QUOTE_ABOVE_BOTTOM = 200
```

## Photos

Folder holding every image the site uses: the gallery photos and the
Venmo logo (relative to index.html).

```js
PHOTO_FOLDER = "assets/"
PHOTO_SMALL_FOLDER = "assets/small/"
```

Every photo to show. Browsers can't look inside a folder on their own,
so add each new photo's filename here, in quotes, followed by a comma.

Photos are shown small (a few hundred pixels across), so the site loads
small copies of them from the folder below instead of the originals: on a
first visit that's about 1.4 MB instead of 20 MB. Each small copy has the
same name with .jpg on the end. A photo with no small copy still shows,
using its original file, so after adding photos to the assets folder ask
Claude to make the small copies (or delete the folder's contents to go back
to the originals). Leave the folder name empty ("") to always use the
originals.

```js
PHOTOS = [
  "children_on_an_oak_tree.jpg",
  "children_playing_in_the_mud.jpg",
  "collaborating_on_building_a_school_model.jpg",
  "forest_camp_comfort.jpeg",
  "libby_bowl_writing.jpg",
  "kids_at_work.jpeg",
  "tent_with_kids.jpeg",
  "tent_kids.jpg",
  "wood_sawing.jpg",
  "wooden_airplane.jpg",
  "kids_crafting_under_tent.jpeg"
]
```

Size range for photos, measured along each photo's longest side.
Every photo gets a random size somewhere in between.

```js
PHOTO_SIZE_SMALLEST = 110
PHOTO_SIZE_LARGEST = 270
```

How long a photo takes to fade in once it loads, in milliseconds.

```js
PHOTO_FADE_IN_MS = 500
```

## Spacing & density

Empty space around photos close to the menu. Each photo picks a random
amount in this range; two photos sit apart by the average of what they want.

```js
SPACING_NEAR_MENU_MIN = 15
SPACING_NEAR_MENU_MAX = 60
```

Photos go from crowded, to sparse, to nothing:

`menu -- crowded --| CROWDED_AREA_RADIUS -- thinning out --| PHOTOS_END_DISTANCE -- empty`

Both distances are in pixels, measured from the center of the menu.
At normal zoom a laptop screen shows about 700 pixels in each direction;
fully zoomed out it shows about three times that (around 2,000-3,000).

HOW GRADUAL IT FEELS comes mostly from the gap between these two numbers:
the bigger the gap, the slower the photos thin out. For an even slower
fade, raise PHOTOS_END_DISTANCE (try 20000 or 30000).

Photos stay fully crowded out to this distance.

```js
CROWDED_AREA_RADIUS = 1500
```

How full the crowded area is, from 0 to 100 (percent).
100 = as packed as the spacing above allows. 50 = about half as many
photos. The thinning-out area scales down along with it.

```js
CROWDED_AREA_DENSITY = 100
```

No photos appear past this distance.

```js
PHOTOS_END_DISTANCE = 12000
```

How the thinning is shaped between those two distances.
1 = thins out evenly the whole way.
Lower (0.5) = stays full longer, then drops off closer to the end.
Higher (2, 3) = thins out sooner, leaving a long, very sparse outer ring.

```js
FADE_CURVE = 1
```

Gaps between photos also widen as they thin out, reaching this many times
the near-menu spacing at the end distance. 1 = no widening.

```js
SPACING_AT_EDGE_MULTIPLIER = 3
```

How many random spots are tried per 1000x1000 pixel area when placing
photos. Higher = more tightly packed (up to the spacing rules above).

```js
PLACEMENT_TRIES = 250
```

Empty space kept between the menu and the nearest photos.

```js
MENU_CLEARANCE = 40
```

What sits in the middle of the screen when the page opens:

- `"options"` = the menu options themselves. The title, tagline and notice
  above them are taller than the options are, so the whole block is lifted
  by however far the options sit below its middle.
- `"everything"` = the block as a whole — title, tagline, notice and options
  together — which leaves the options themselves below the middle.

```js
MENU_CENTER_ON = "everything"
```

Change this to any other whole number for a completely different
(but still consistent) arrangement of photos. Or write
`LAYOUT_SEED = random`
(no quotes) to scatter the photos differently on every visit.

```js
LAYOUT_SEED = random
```

## Photo frames

Space between a photo and its border.

```js
FRAME_PADDING = 3
```

Thickness of the border line.

```js
FRAME_BORDER_WIDTH = 0
```

Border color, and the color of the padding around each photo
("transparent" = no visible frame; the padding is just a gap).

```js
FRAME_BORDER_COLOR = "rgba(255, 255, 255, 0.35)"
FRAME_FILL_COLOR = "transparent"
```

Rounded corners on the photos (true or false, no quotes).

```js
PHOTO_ROUNDED_CORNERS = true
```

How rounded. With PHOTO_CORNER_RADIUS_UNIT = "pixels" this is a size in
pixels (0 = square, 12 = gently rounded, 30 = very round). With "percent"
it's a percentage of each photo's shorter side, so big and small photos
look equally round (50 = as round as possible).

```js
PHOTO_CORNER_RADIUS = 15
PHOTO_CORNER_RADIUS_UNIT = "pixels"
```

## Zoom & movement

How far visitors can zoom out and in (3 = three times smaller / larger).
Explore mode only; read mode stays at normal zoom.

```js
ZOOM_OUT_LIMIT = 10
ZOOM_IN_LIMIT = 3
```

Zoom speed for a mouse scroll wheel, and for a trackpad pinch (explore mode).

```js
WHEEL_ZOOM_SPEED = 0.0015
TRACKPAD_PINCH_ZOOM_SPEED = 0.01
```

How long the landscape keeps gliding after a quick drag is released.
0 = stops instantly; closer to 1 = glides longer (keep below 1).

```js
GLIDE_AFTER_DRAG = 0.90
```

How far the arrow keys move the view per press.

```js
KEYBOARD_MOVE_STEP = 120
```

How long the menu bar's Home option takes to glide back to the main menu,
in milliseconds.

```js
HOME_TRAVEL_MS = 800
```

## The play's page (is_nirmal_normal.html)

Behind the words on the play's page, the person icon is repeated in an even
grid, with one of them drawn as an outline instead of filled in. Its words
are in sections/is_nirmal_normal/is_nirmal_normal.md, like the other pages.

The drawing that's repeated, how tall each one is, and the space left
between them, in pixels. Every other row is stepped half a place across, so
each figure stands between the two in the row below. Any empty margin around
the figure in the drawing is trimmed off first, so the gap set here is the
gap that shows on the page.

```js
PLAY_BACKGROUND_ICON = "assets/person_icon.svg"
PLAY_ICON_HEIGHT = 200
PLAY_ICON_GAP = 20
```

Their color.

```js
PLAY_ICON_COLOR = "#000000"
```

The title can be broken into two lines with the outlined figure standing
between them, front and centre, and this is how those lines read. Leave the
list empty to keep the title in one piece, in which case the outlined figure
takes its place among the others instead. The figure's height is in pixels.

```js
PLAY_TITLE_LINES = [
  "Is Nirmal",
  "Normal?",
]
PLAY_TITLE_FIGURE_HEIGHT = 200
```

Where the figure stands:

- `"between"` = between the first line and the rest, so the title reads
  around it. This needs at least two lines above.
- `"below"` = under the whole heading, with the lines one above the other.

```js
PLAY_TITLE_FIGURE_PLACE = "below"
```

Whether whole rows of figures stand above the heading, and how many. The
heading is pushed down the page far enough to leave room for them, each
spaced from the next as everywhere else, and the last of them spaced off the
heading by PLAY_TEXT_CLEARANCE below, so it isn't hidden for standing too
close. `false` (or 0 rows) leaves the heading where the page puts it.

```js
PLAY_SPACE_ABOVE_HEADING = true
PLAY_ROWS_ABOVE_HEADING = 1
```

The words come first: any figure that would sit under the heading or the
text steps aside, leaving this much space around them, in pixels.

```js
PLAY_TEXT_CLEARANCE = 24
```

How many rows of figures carry on below the last line of words, so the page
doesn't stop the moment the words do.

```js
PLAY_ROWS_AFTER_TEXT = 1
```

Space left under the last row before the page ends, in pixels. The space
above the top row is PLAY_ICON_GAP, so the same number here sets the figures
the same distance off the bottom of the page as off the menu bar.

```js
PLAY_BOTTOM_PADDING = 20
```

Whether the outlined figure carries a question mark, set in this page's
heading font (PLAY_HEADING_FONT). Its size and how far down it stands are
percentages of the figure's own height, so they hold whatever size the
figure is: 40 is a mark two fifths as tall as the whole figure, and 36 puts
its middle a little over a third of the way down, in the chest.

```js
PLAY_QUESTION_MARK = false
PLAY_QUESTION_MARK_SIZE = 30
PLAY_QUESTION_MARK_FROM_TOP = 36
```

One of them is drawn as an outline: the same figure traced with a pen
instead of filled in. How thick that line is, in pixels, and which one it
is:

- "random" picks a different one each visit, away from the very edges.
- "middle" is the one in the middle of the page, which on a short page sits
  behind the heading.
- A number counts across the rows from the top left, 0 being the first.

```js
PLAY_OUTLINE_THICKNESS = 3
PLAY_OUTLINE_WHICH = "middle"
```

The menu bar on this page alone: its color, and the color and thickness of
the outline drawn around it. A thickness of 0 leaves no outline.

```js
PLAY_MENU_BACKGROUND = "#ffffff"
PLAY_MENU_OUTLINE_COLOR = "#000000"
PLAY_MENU_OUTLINE_THICKNESS = 2
```

Fonts for this page alone, from Google Fonts (fonts.google.com), written
exactly as they appear there. Leave either empty ("") to use the same font
as the rest of the site.

```js
PLAY_HEADING_FONT = "Lexend"
PLAY_BODY_FONT = "Crimson Text"
PLAY_HEADING_FONT_WEIGHT = 600
PLAY_BODY_FONT_WEIGHT = 500
```

## Things built separately

Some things are built on their own and dropped into a section or a page: the
explorations wheel, for instance. Each one gets a name here and the file it
lives in. To show it, write its name between exclamation marks on a line of
its own in a section file:

`!wheel!`

Anything shown this way keeps to its own frame, so whatever colours, fonts
or movement it carries can't reach the rest of the page. A name that isn't
listed here is left alone as ordinary words.

```js
EMBEDS = {
  "wheel": "embeds/explorations_wheel.html",
  "map": "embeds/regen_tropics_map.html",
  "rsvp": {
    file: "embeds/rsvp.html",
    height: 150,
    touch: "always",
    settings: {
      confetti: true,
      confettiPieces: 26,
      confettiMs: 1400,
      thankYou: "Thank you!",
      thankYouMs: 2600,
      dropMs: 320,
    },
  },
}
```

What the RSVP box does once an RSVP has gone through, under its `settings`:

- `confetti` — `false` for none. The pieces are black and white, thrown up
  out of the button. `confettiPieces` is how many, `confettiMs` how long
  they last before they have faded away, in milliseconds. They are kept
  inside the box's own frame, so a gentle handful reads better than a
  shower.
- `thankYou` — the words that roll down under the boxes. Leave it empty
  ("") for none. `thankYouMs` is how long they stay before rolling back up;
  0 leaves them up. `dropMs` is how long the rolling takes.

Anything written under `settings` is handed to the embed on the end of its
address, since a thing built separately is shown in a frame of its own and
can't read this file.

A name can point straight at a file, as the first two do, or at a file with
some things said about it, as the last one does:

- `file` — the file it lives in. Always needed.
- `height` — how tall its frame is, in pixels, instead of EMBED_HEIGHT below.
- `touch` — `"always"` for something you fill in, like a box for an email
  address: it can be used straight away, with no word in front of it, since
  it has nothing to take a roll of the wheel with. `"wake"` for something
  that does — a map, a spinning wheel — which waits under a word until it's
  clicked. Left out, it's there to look at and not to touch.
- `label` — the word it waits under, with `"wake"`, instead of
  EMBED_WAKE_LABEL below.

Anything shown this way is normally there to look at, not to touch: the
pointer goes straight through it, so rolling the wheel over it scrolls the
page rather than turning the wheel drawing or zooming the map. Name an embed
here to let people use it instead. It waits under a word, and once that word
is clicked it works like anything else until the pointer moves off it, at
which point it steps out of the way again.

```js
EMBEDS_YOU_CAN_TOUCH = ["map"]
EMBED_WAKE_LABEL = "Click to use the map"
```

How tall the frame is, in pixels. It is always as wide as the words around
it.

```js
EMBED_HEIGHT = 500
```

## Colors

```js
BACKGROUND_COLOR = "#fffef7"
TEXT_COLOR = "#0b1105"
```

Accent color: fills the menu bar across the top of the screen. #e8f0d4

```js
ACCENT_COLOR = "#dfeac0"
```

Color the home screen's title and the line under it with the accent color
(true), or with TEXT_COLOR like the rest of the text (false).

```js
MENU_TITLE_IN_ACCENT_COLOR = false
```

The menu bar across the top appears once the main menu has been scrolled
off screen. Its height, and the size of its text, in pixels:

```js
TOP_MENU_HEIGHT = 64
TOP_MENU_TEXT_SIZE = 17
```

Hovering an option in the menu bar spreads its letters apart, nudging the
options beside it. Letter spacing while hovered, as a fraction of the
letter size (at rest it uses MENU_LETTER_SPACING_HOVER), and how long the
spreading takes, in milliseconds.

```js
TOP_MENU_HOVER_LETTER_SPACING = 0.5
TOP_MENU_HOVER_SPEED_MS = 250
```

Underline a menu bar option while the pointer is over it, growing out from
the middle (true or false), and how thick the line is, in pixels.

```js
TOP_MENU_UNDERLINE_ON_HOVER = false
TOP_MENU_UNDERLINE_THICKNESS = 2
```

When a chosen option leans up (on its way to a section above), its
underline turns into a small arrow under the word pointing up (true or
false). Length of each side of the arrow, in pixels.

```js
TOP_MENU_ARROW_WHEN_MOVING_UP = false
TOP_MENU_ARROW_SIZE = 10
```

Slide the menu bar down from the top of the screen when it appears, and
back up when it goes (true), or show and hide it instantly (false).

```js
TOP_MENU_ANIMATION = true
```

How long that slide takes, in milliseconds.

```js
TOP_MENU_SLIDE_MS = 350
```

A menu option (on the home screen or in the menu bar) glows for a moment
when it's clicked (true or false, no quotes), in this color, for this many
milliseconds.

```js
MENU_CLICK_GLOW = false
MENU_CLICK_GLOW_COLOR = "#ffffff"
MENU_CLICK_GLOW_MS = 1200
```

When a menu option is chosen, its letters (only in the menu you clicked)
jump to scattered heights, stay there while the page
glides to its section, and drop back into line once it arrives.
On or off (true or false, no quotes):

```js
MENU_CLICK_NUDGE = false
```

How far the letters jump, as a fraction of the letter size:

```js
MENU_CLICK_NUDGE_AMOUNT = 0.25
```

How long they take to jump and to drop back, in milliseconds:

```js
MENU_CLICK_NUDGE_SPEED_MS = 150
```

The chosen option's letters also spread apart until it arrives (true or
false), by this much per letter, as a fraction of the letter size:

```js
MENU_CLICK_EXPAND = true
MENU_CLICK_EXPAND_AMOUNT = 0.12
```

The chosen option's whole word also moves down (to a section further down
the page) or up (to one above) until it arrives, so it looks like it's
leading the way (true or false). How far, as a fraction of the letter size:

```js
MENU_CLICK_MOVE_TOWARD_SECTION = true
MENU_CLICK_MOVE_AMOUNT = 0.4
```

The menu bar's first option, which takes you back to the main menu.

```js
TOP_MENU_HOME_LABEL = "Home"
```

## Fonts & menu

The big title at the top of the menu.

```js
MENU_TITLE = "The School From Scratch"
```

A line of text under the title. Leave empty ("") for none.

```js
MENU_SUBTITLE = "An Educational Commons for students, teachers, parents, and other learners."
```

A small notice under the title and the line below it: a rounded patch of the
accent color with a few words in it, for something passing, like a play or
an open day. Leave the words empty ("") to hide it altogether.

The words are written like the section files, so **bold** and *italic*
work. The link is where it leads: a page on this site ("play.html"), a
section of the home page ("#cost"), a full web address, or an email
("mailto:hello@example.org"). Leave the link empty for a notice that just
says something without leading anywhere.

```js
HOME_NOTICE = "The School From Scratch is producing the play *Is Nirmal Normal?* Click to learn more!"
HOME_NOTICE_LINK = "is_nirmal_normal.html"
```

The size of its words, in pixels, and the space between the line above it
and the notice.

```js
HOME_NOTICE_TEXT_SIZE = 18
HOME_NOTICE_GAP = 20
```

The menu options, top to bottom. Each one goes in quotes, followed by a
comma. Reorder, add, or remove lines to change the menu.

Each option opens its own page file, named after it in lowercase with
dashes: "People" opens people.html. When you add a new
option, copy cost.html, rename the copy to match, and change the name in its
data-page="..." line. (Until you do, it still works on a web server, but not
when index.html is opened straight from the folder.)

```js
MENU_ITEMS = [
  "Approach",
  "People",
  "Parent-Learning",
  "Logistics",
  "FAQs",
  "Cost",
]
```

Menu options that open an address of their own instead of scrolling to a
section on the home page. Write the option's name exactly as in MENU_ITEMS,
then a colon and the address in quotes: a page on this site
("payments.html") or a full web address ("https://example.com"). An option
listed here has no section of its own and needs no file in the sections
folder.

```js
MENU_LINKS = {
  "Payments": "payments.html",
  "Contact": "contact.html",
}
```

Options that belong only to the menu bar across the top, not to the menu on
the home screen. They come after the menu's own options, and their addresses
come from MENU_LINKS above, the same as any other option's.

```js
TOP_MENU_EXTRA_ITEMS = [
  "Payments",
  "Contact",
]
```

Fonts are loaded from Google Fonts (fonts.google.com). Type the family name
exactly as it appears there, in quotes. Weight: 400 = regular, 500 = medium,
600 = semi-bold, 700 = bold (the font must offer that weight).

The title, "The School From Scratch".

```js
HEADING_FONT = "Lora"
HEADING_FONT_WEIGHT = 600
```

Everything else: the menu options and the menu bar across the top.

```js
BODY_FONT = "Quicksand"
BODY_FONT_WEIGHT = 500
```

Text sizes, in pixels. Both shrink automatically on narrow screens.
HEADING_FONT_SIZE is the heading on the separate pages; BODY_FONT_SIZE is
the menu options.

```js
HEADING_FONT_SIZE = 64
BODY_FONT_SIZE = 24
```

The big title on the home screen, and the line under it, in pixels. Both
shrink automatically on narrow screens.

```js
MENU_TITLE_SIZE = 76
MENU_SUBTITLE_SIZE = 24
```

Space between the title and the line under it, in pixels.

```js
SUBTITLE_GAP = 16
```

Space between the title (or the line under it) and the menu options below,
in pixels. Bigger = the title sits higher, more like a heading on its own.

```js
TITLE_GAP = 50
```

Menu options start with their letters spread apart and draw together when
the pointer moves over them. Spacing is a fraction of the letter size
(0 = normal spacing, 0.3 = noticeably spread out).

```js
MENU_LETTER_SPACING = 0.55
MENU_LETTER_SPACING_HOVER = 0.15
```

How far each letter starts nudged up or down before it drops into place
when the pointer moves over the option (0 = perfectly lined up).

```js
MENU_LETTER_OFFSET = 0.15
```

Which way each letter is nudged. A whole number keeps the same scatter on
every visit; the word random (no quotes) scatters them afresh each time.

```js
MENU_LETTER_SEED = random
```

Turn either part of that movement off (true or false, no quotes).
Sideways: letters spread apart and draw together.
Up and down: letters sit off the line and drop into place.

```js
MENU_LETTERS_SPREAD_SIDEWAYS = true
MENU_LETTERS_NUDGE_UP_DOWN = false
```

Which way the hover goes.
false = letters rest spread out and draw together when hovered.
true  = the reverse: letters rest tidy and spread out when hovered.

```js
MENU_HOVER_EXPANDS = true
```

Underline an option while the pointer is over it, growing outward from the
middle. It starts once that option's letters have settled; the delay below
is the extra pause on top of that.

```js
MENU_UNDERLINE_ON_HOVER = false
MENU_UNDERLINE_DELAY_MS = 10
MENU_UNDERLINE_SPEED_MS = 200
MENU_UNDERLINE_THICKNESS = 3
```

How long the letters take to settle, in milliseconds. This is the time for
the letter with the farthest to travel; nearer letters take proportionally
less, so every letter moves at the same speed in every option.

```js
MENU_HOVER_SPEED_MS = 150
```

true = every letter moves at the same speed, so letters with farther to go
take longer (long options take longer to settle than short ones).
false = every letter takes exactly MENU_HOVER_SPEED_MS, however far it
moves (the original behavior; long options look like they move faster).

```js
MENU_LETTERS_EVEN_SPEED = false
```

Letters start moving at slightly different moments, each up to this many
milliseconds after the others. 0 = every letter starts at the same time.

```js
MENU_LETTER_STAGGER_MS = 0
```

## Pages

In read mode, each menu option (on the home screen and in the menu bar)
scrolls down to that option's section on the same page.

Each section's text is its own file in the "sections" folder, named after
the menu option in lowercase with dashes: People -> sections/people.md,
Parent-Learning -> sections/parent-learning.md. Edit a file, save it,
and reload the page. A missing or empty file shows "Under Development".
The section's heading is the menu option's name, so don't repeat it.

The files are Markdown, like this one:

- An empty line starts a new paragraph. Each further empty line adds a blank line's worth of space, so pressing Enter a few times spaces things out the way it looks in the file.
- An empty line between list items is fine: the list carries on (numbers keep counting) and its items sit a little further apart.
- A line starting with `#` is a small heading: `# Our questions`
- A line starting with `##` is a centered name: `## Dr. Gopal Krishnamurthy`. The lines right under it (before the next blank line) are centered too, for a picture and a title.
- To center part of a page, put `->` on a line of its own where it should start and `<-` on a line of its own where it should stop. Everything between them is centered, however many paragraphs, headings and lists that is. For a single line, write `-> the line <-` on its own instead.
- Two columns with a gutter down the middle, for a cast list: `**The Writer** — Gopal Krishnamurthy`. What's before the em dash (—) is set against the gutter on the left, what's after it runs on from the gutter on the right, and the dash itself doesn't show. It takes two such lines to make a list, with or without empty lines between them, and each has to start on a line of its own — so an em dash in the middle of a sentence stays an em dash. On a narrow screen the two sides stack, one above the other.
- A picture: `![Headshot of Gopal](assets/gopal_headshot.jpeg)`. On a line of its own it sits centered. Put picture files in assets/.
- Lines starting with `-` make a list. Lines starting with `1.` `2.` `3.` make an ordinary numbered list.
- Numbered `1)` `2)` `3)` instead — with a bracket rather than a dot — makes the steps: each number sits in a filled accent-color circle with room between them, the way the payments page sets out how to pay. Use it for something to follow in order; use `1.` for an ordinary list.
- `**bold**`, `*italic*`, `***bold and italic***`
- A link: `[the words to click](https://example.com)`, or to a page on this site: `[Make a payment](payments.html)`
- Put `\` in front of a character to show it as it is: `\*not italic\*`

(The text files only load when the site is served, e.g. on localhost or online, not when index.html is opened straight from the folder.)

For the two-column lists above (`Role — Name`): how far apart the two sides
sit, in pixels. Raise it to push the two columns further apart.

```js
TWO_COLUMN_GAP = 64
```

What stands in the gutter between the two columns. The em dash you write in
the file always marks the split; this is only about what shows on the page:

- `false` (or `""`) = nothing, just the space. This is how a theatre
  programme sets a cast list.
- `true` = an em dash (—).
- Any characters of your own, in quotes: `"–"`, `"·"`, `"~"`, `"as"`, `":"`.

Whatever it is, it stands in the middle of the space set above, so the two
sides sit just as far apart whether it's there or not.

```js
TWO_COLUMN_DASH = true
```

In explore mode, or with the gallery off, each option opens its own page
instead (people.html, cost.html, ...), showing its name and
"Under Development".

Room for photos between one section and the next (and between the menu and
the first section), in pixels. Photos can also sit beside the text.

```js
SPACE_BETWEEN_SECTIONS = 550
```

Photos are crowded only around the menu. From the top of the first
section they thin out gradually, over this many pixels, until there are
none left (like CROWDED_AREA_RADIUS to PHOTOS_END_DISTANCE in the gallery).
Bigger = a slower, more gradual thinning. The shape of the thinning follows
FADE_CURVE. If the sections are longer than this (on a phone, say), it
stretches so there are still photos down to the last section.

```js
SECTION_PHOTO_THIN_OUT_DISTANCE = 10500
```

Empty space kept between a section's text and the nearest photo, in pixels.

```js
SECTION_PHOTO_CLEARANCE = 40
```

Widest the text of a section can be, in pixels. On narrow screens it fills
the screen, less a small margin on each side.

```js
SECTION_TEXT_WIDTH = 720
```

How wide the paragraphs and lists inside a section may be, in pixels. 0
lets them fill the width above. A smaller number keeps the lines short,
which is easier to read: around 60 to 75 letters a line is comfortable, so
480 to 620 at the text size below. Headings, names and pictures still use
the full width.

```js
SECTION_PARAGRAPH_WIDTH = 0
```

Text sizes in the sections, in pixels: each section's heading (it shrinks
on narrow screens) and its paragraphs.

```js
SECTION_HEADING_SIZE = 44
SECTION_TEXT_SIZE = 19
```

Widest a picture in a section (a headshot, say) can be, in pixels. It uses
the same rounded corners as the gallery photos.

```js
SECTION_PICTURE_WIDTH = 250
```

How tall a picture in a section is, in pixels. 0 lets each picture be as
tall as it comes out at its width, keeping its shape. Any other number makes
every picture that tall: it fills the width and the height, taking the
middle of the picture if the two don't match, so a row of headshots all line
up.

```js
SECTION_PICTURE_HEIGHT = 0
```

When a menu option is chosen, the page glides down to the section (true)
or jumps straight there (false). No quotes. The same goes for the
menu bar's Home option.

```js
SECTION_LINKS_SCROLL_SMOOTHLY = true
```

How long that glide takes, in milliseconds, however far the section is.
(Home uses HOME_TRAVEL_MS.)

```js
SECTION_SCROLL_MS = 1000
```

How far below the top of the screen a section's heading lands after
choosing it from the menu, in pixels.

```js
SECTION_SCROLL_MARGIN = 96
```

Sections (and pages) that show the contact details below: the phone number,
and the Venmo logo if it's switched on. Use the names exactly as in
MENU_ITEMS, in quotes, separated by commas. Empty (`[]`) shows them nowhere.

```js
CONTACT_PAGES = []
```

Phone number shown on those pages. Tapping it on a phone starts a call.
Leave empty ("") to hide it.

```js
PHONE_NUMBER = "+1 (805) 798-5098"
```

Show the Venmo logo under the phone number (true or false).

```js
SHOW_VENMO_LOGO = false
```

Optional: a web address the Venmo logo opens when clicked, starting with
https:// (for example your Venmo profile link). Leave "" for no link.

```js
VENMO_LINK = ""
```

## Payments page (payments.html)

The payments page shows the heading, the Zelle logo, and the steps for
sending a payment. Details that are still empty below show as a [bracketed
placeholder].

The school's Zelle tag (or the email or US phone number its Zelle is
registered to), and the name parents will see when they send to it.

```js
ZELLE_RECIPIENT = "transformativeedu26"
ZELLE_RECIPIENT_NAME = "The School From Scratch"
```

The words on the payments page are in their own text file, written in
Markdown like the section files. Edit it, save, and reload the page.
{ZELLE_RECIPIENT} in that file is replaced with the setting below, so the
Zelle tag is only written in one place; any setting's name works that way.
A numbered list in that file becomes the steps, each number in a filled
accent circle.

```js
PAYMENTS_TEXT_FILE = "sections/payments/payments.md"
```

Show the Zelle logo on the payments page at all (true or false, no quotes).
false hides it, leaving the heading and the steps.

```js
SHOW_ZELLE_LOGO = false
```

The Zelle logo file, and how wide it's shown, in pixels. Its corners are
rounded like the gallery photos' (PHOTO_CORNER_RADIUS). Download the
official logo from Zelle's brand page (zellepay.com has a "Brand guidelines"
section), save it in the assets folder, and put its file name here, for
example "assets/zelle_logo.svg". While this is empty, the page shows the
word "Zelle" instead.

```js
ZELLE_LOGO = "assets/Zelle_logo.svg"
ZELLE_LOGO_WIDTH = 240
```

Size of the numbered circles beside the steps, and the space between one
step and the next, in pixels.

```js
PAYMENT_STEP_CIRCLE_SIZE = 36
PAYMENT_STEP_SPACING = 28
```

## Page not found (404.html)

When someone follows a broken link they get this page: the menu bar, a big
404, and "Page not found". Pushing any character sets the whole page of text
loose: every letter and number becomes an object of its own, shaped like the
character itself, and they fall, spin, bounce off the edges of the page and
off each other, and settle in a heap. A push sends a character away from the
spot it was pushed, so a push from below sends it up, and a push off-centre
sets it spinning. true or false, no quotes:

```js
NOT_FOUND_PUSHABLE_NUMBERS = true
```

How strongly they're pulled downward, in pixels per second, per second
(2600 feels about like real weight; 0 leaves them floating).

```js
NOT_FOUND_GRAVITY = 2200
```

How bouncy they are, from 0 to 1: 0 = they land with a thud, 0.55 = a few
bounces, 0.9 = very lively.

```js
NOT_FOUND_BOUNCE = 0.35
```

How fast a push sends a character off, in pixels a second (700 is a firm
shove across a laptop screen; 300 is gentle). A push near the edge of a
character is a little stronger than one in its middle, and sets it spinning
more.

```js
NOT_FOUND_PUSH = 700
```

A push isn't felt by one character alone. It spreads out from the spot
pushed and fades with distance: characters right next to it are shoved hard,
those further off drift, and those beyond this reach (in pixels) stay put.
Once the characters are loose, a push anywhere on the page counts, not only
one that lands on a character.

```js
NOT_FOUND_PUSH_REACH = 260
```

The very first push is a burst that reaches the whole page, this many times
the usual strength (1 = the same as any other push).

```js
NOT_FOUND_FIRST_BLAST = 1.25
```

Holding a click on a character (or dragging it) picks it up instead of
pushing it: it hangs from the pointer, swinging under its own weight, and is
thrown when the click ends. How long a click has to be held before it counts
as picking up, in milliseconds, and how closely the character follows the
pointer, from 0.01 (loose and swingy) to 1 (stuck to it).

```js
NOT_FOUND_HOLD_TO_PICK_UP_MS = 150
NOT_FOUND_DRAG_GRIP = 0.2
```

How quickly they stop sliding along the bottom of the page, from 0 (slides
like ice) to 1 (stops almost at once).

```js
NOT_FOUND_FLOOR_GRIP = 0.6
```

Each character's shape is built from the character itself, in squares this
many pixels across: smaller numbers follow the letter more closely but give
the page more to think about (5 is finely detailed, 7 is the middle, 12 is
blocky).

```js
NOT_FOUND_SHAPE_DETAIL = 7
```

The gap kept between the characters and the edges of the page (and the menu
bar), in pixels, so a character at rest is never flush against an edge.

```js
NOT_FOUND_EDGE_SPACE = 10
```

## Background grid

Show a faint grid behind everything (true or false, no quotes).
With the gallery on, it moves and zooms along with the photos.

```js
GRID_ENABLED = false
```

Size of each grid square at normal zoom.

```js
GRID_SQUARE_SIZE = 50
```

Line color. The last number is how visible the lines are:
0 = invisible, 1 = solid. Around 0.05 to 0.12 keeps it subtle.

```js
GRID_LINE_COLOR = "rgba(255, 255, 255, 0.07)"
```

Line thickness at normal zoom (lines shrink and grow with zoom, like the photos).

```js
GRID_LINE_THICKNESS = 3
```

true = the grid fades away toward the edges of the screen.
false = the grid is evenly visible everywhere.

```js
GRID_FADES_AT_EDGES = false
```

## Performance

true = show a performance panel in the top-right corner: frames per second,
a live frame-time graph (green = smooth, yellow = OK, red = a stutter),
what's being drawn, memory use, your position and zoom, and more.
Press P on the keyboard to hide or show it. Set back to false before publishing.

```js
SHOW_PERFORMANCE_INFO = false
```

true = next to the frames-per-second number, also show a one-word rating
(BUTTERY, SMOOTH, OK, CHOPPY, or IDLE when standing still).

```js
SHOW_PERFORMANCE_RATING = false
```

true = when zoomed out, draw areas of photos once and reuse them (like an
online map loads tiles). Much smoother. Photos at the edge of the screen
may take a moment to sharpen or appear after a big zoom.
false = draw every photo individually every frame (slower when zoomed out).

```js
SPEED_UP_ZOOMED_OUT_VIEW = true
```

true = while you're dragging or zooming out, draw at slightly lower
sharpness on high-resolution screens, then sharpen when you stop.
No effect on standard screens.

```js
LOWER_RESOLUTION_WHILE_MOVING = true
```

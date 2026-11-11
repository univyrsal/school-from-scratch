# The School From Scratch — Website Settings

The website reads only the code blocks; everything else is notes. A block with a mistake is skipped and its settings fall back to the defaults (the browser console says which). Settings only load when the site is served, not when index.html is opened from the folder.

Sizes are in pixels and times in milliseconds unless a note says otherwise.

## Gallery on / off

Off shows just the title and menu: no photos and no menu bar.

```js
GALLERY_ENABLED = true
```

- `"read"` = an ordinary scrolling page.
- `"explore"` = drag in any direction, and zoom with the mouse wheel or a pinch.

```js
GALLERY_MODE = "read"
```

## The RSVP emails

When someone RSVPs on the play's page, one email goes to whoever runs the show and one to the person who RSVP'd. Who they go to and the address they come from are set in the Cloudflare dashboard.

Type these into the wording, curly brackets and all, and they're filled in when the email is sent:

- `{show}` — the show's name
- `{date}` — RSVP_EMAIL_DATE
- `{place}` — RSVP_EMAIL_PLACE
- `{seats}` — "1 seat" or "3 seats"
- `{count}` — just the number
- `{email}` — the address the person gave

A misspelt one is sent exactly as typed.

```js
RSVP_EMAIL_DATE = "October 4th at 2pm"
RSVP_EMAIL_PLACE = "The Ojai Retreat & Inn (160 Besant Rd, Ojai, CA 93023)"
```

An empty line starts a new paragraph.

```js
RSVP_EMAIL_TO_YOU_SUBJECT = "RSVP: {seats} for {show}"
RSVP_EMAIL_TO_YOU_BODY = `A new RSVP for {show}.

Email: {email}
Seats: {count}

Reply to this message to answer them directly.`

RSVP_EMAIL_TO_THEM_SUBJECT = "Your RSVP for '{show}'"
RSVP_EMAIL_TO_THEM_BODY = `Your RSVP is in. Thank you!

We have put you down for {seats} at {show}

When: {date}
Where: {place}

We hope to see you at the show!`
```

Email programs only use fonts the reader already has (Google Fonts won't arrive), so list a few, ending in `serif` or `sans-serif`.

```js
RSVP_EMAIL_FONT = "Georgia, 'Times New Roman', serif"
RSVP_EMAIL_TEXT_SIZE = 18
```

The picture under the words is RSVP_EMAIL_IMAGE, further down. Give its full path, e.g. `"assets/wooden_airplane.jpg"`: a wrong path is a broken picture in the email, with no warning here. Some email programs hide pictures until asked, so don't put anything important only in the picture.

Which side it sits on: `"left"`, `"center"` or `"right"`.

```js
RSVP_EMAIL_IMAGE_ALIGN = "left"
```

Small print at the end of both emails, under a faint line. Empty ("") for none. `{date}` and the others work here too.

Opacity: 1 = as dark as the rest of the email, 0.55 = soft grey, 0.3 = very faint.

// --Maxwell // Add this back to RSVP_EMAIL_IMAGE if you want assets/person_icon_high_quality.png

```js
RSVP_EMAIL_FOOTER = "The School From Scratch; The Transformative Education Center is a 501 (c) (3) non-profit organization."
RSVP_EMAIL_FOOTER_TEXT_SIZE = 12
RSVP_EMAIL_FOOTER_OPACITY = 0.55
```

```js
RSVP_EMAIL_IMAGE = ""
RSVP_EMAIL_IMAGE_WIDTH = 140
```

### Scrolling

Show the browser's scrollbar on every page. Scrolling works the same either way.

```js
SHOW_SCROLLBAR = false
```

How far above the Home position the page can scroll. 0 = the top of the page is Home.

```js
READ_MODE_SCROLL_ABOVE_HOME = 0
```

How far past the last section the page can scroll. 0 = it stops where the last section ends. It never goes past where the photos run out.

```js
READ_MODE_SCROLL_BELOW_SECTIONS = 400
```

Words at the very end of the page, after the last section. Empty ("") for none. *italic* and **bold** work. Then its size, and its distance above the bottom of the page.

// --Maxwell // I removed the quote but if anyone wants to add it back this is the one I chose: '*There is no end to education. It isn’t that you read a book and pass an examination, and then finish with education. You think you have finished with it. You have not. The whole of life—from now, from the moment you are born till the moment you die, it’s a process of learning.*' —Jiddu Krishnamurti, Rishi Valley, 1 February 1966

```js
END_QUOTE = ""
END_QUOTE_SIZE = 24
END_QUOTE_ABOVE_BOTTOM = 200
```

## Photos

The photos' folder, and the folder of their small copies, which the site loads instead (much faster). A photo with no small copy uses its original. An empty small folder ("") always uses the originals.

```js
PHOTO_FOLDER = "assets/"
PHOTO_SMALL_FOLDER = "assets/small/"
```

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

Each photo gets a random size in this range, measured along its longest side.

```js
PHOTO_SIZE_SMALLEST = 110
PHOTO_SIZE_LARGEST = 270
```

```js
PHOTO_FADE_IN_MS = 500
```

## Spacing & density

Gap around photos near the menu: each photo picks a random amount in this range.

```js
SPACING_NEAR_MENU_MIN = 15
SPACING_NEAR_MENU_MAX = 60
```

Photos go from crowded, to thinning out, to none:

`menu -- crowded --| CROWDED_AREA_RADIUS -- thinning out --| PHOTOS_END_DISTANCE -- empty`

Both are measured from the center of the menu; a laptop screen shows about 700 pixels each way. The bigger the gap between them, the more gradual the thinning.

```js
CROWDED_AREA_RADIUS = 1500
```

How full the crowded area is, in percent (100 = as packed as the spacing allows). The thinning area scales with it.

```js
CROWDED_AREA_DENSITY = 100
```

```js
PHOTOS_END_DISTANCE = 12000
```

Shape of the thinning: 1 = even; lower (0.5) = stays full longer, then drops off; higher (2, 3) = thins sooner, leaving a long sparse ring.

```js
FADE_CURVE = 1
```

Gaps widen as the photos thin out, up to this many times the near-menu gap. 1 = no widening.

```js
SPACING_AT_EDGE_MULTIPLIER = 3
```

Spots tried per 1000 × 1000 pixel area when placing photos. Higher = more tightly packed.

```js
PLACEMENT_TRIES = 250
```

Gap between the menu and the nearest photos.

```js
MENU_CLEARANCE = 40
```

What sits in the middle of the screen when the page opens:

- `"options"` = the menu options.
- `"everything"` = the title, tagline, notice and options together.

```js
MENU_CENTER_ON = "everything"
```

Any whole number gives its own fixed arrangement of photos; `random` rearranges them on every visit.

```js
LAYOUT_SEED = random
```

## Photo frames

Space between a photo and its border.

```js
FRAME_PADDING = 3
```

```js
FRAME_BORDER_WIDTH = 0
```

"transparent" = no visible frame.

```js
FRAME_BORDER_COLOR = "rgba(255, 255, 255, 0.35)"
FRAME_FILL_COLOR = "transparent"
```

```js
PHOTO_ROUNDED_CORNERS = true
```

With "pixels": 0 = square, 12 = gently rounded, 30 = very round. With "percent": a share of each photo's shorter side (50 = as round as possible).

```js
PHOTO_CORNER_RADIUS = 15
PHOTO_CORNER_RADIUS_UNIT = "pixels"
```

## Zoom & movement

Explore mode only. How far visitors can zoom out and in (3 = three times smaller / larger).

```js
ZOOM_OUT_LIMIT = 10
ZOOM_IN_LIMIT = 3
```

The browser's own zoom (Ctrl and the mouse wheel, Ctrl and +/−):

- `true` = the whole page grows as one piece, exactly as at 100%; nothing rearranges, and it scrolls sideways when zoomed in. Phones and narrow windows still shrink to fit.
- `false` = the page shrinks to keep the menu on screen, however far it's zoomed in.

```js
BROWSER_ZOOM_ENLARGES = true
```

Explore mode only.

```js
WHEEL_ZOOM_SPEED = 0.0015
TRACKPAD_PINCH_ZOOM_SPEED = 0.01
```

How long the view keeps gliding after a drag: 0 = stops at once; closer to 1 = longer (keep it below 1).

```js
GLIDE_AFTER_DRAG = 0.90
```

How far one arrow key press moves the view (explore mode).

```js
KEYBOARD_MOVE_STEP = 120
```

How long the menu bar's Home option takes to glide back to the main menu.

```js
HOME_TRAVEL_MS = 800
```

## The play's page (is_nirmal_normal.html)

Off sends visitors to the home page instead, and hides the home notice (while HOME_NOTICE_LINK points to the play's page) and any menu option leading to it. On brings it all back.

```js
PLAY_PAGE_ENABLED = false
```

The drawing repeated behind the words, each one's height, and the gap between them. Empty margins in the drawing are trimmed, so the gap is exactly what shows.

```js
PLAY_BACKGROUND_ICON = "assets/person_icon.svg"
PLAY_ICON_HEIGHT = 200
PLAY_ICON_GAP = 20
```

```js
PLAY_ICON_COLOR = "#000000"
```

The title, line by line, with the outlined figure standing with it (PLAY_TITLE_FIGURE_PLACE says where). An empty list keeps the title in one piece and puts the figure back among the others.

```js
PLAY_TITLE_LINES = [
  "Is Nirmal",
  "Normal?",
]
PLAY_TITLE_FIGURE_HEIGHT = 200
```

Where the figure stands:

- `"between"` = between the first line and the rest (needs two or more lines).
- `"below"` = under the whole heading.

```js
PLAY_TITLE_FIGURE_PLACE = "below"
```

Rows of figures above the heading; the heading moves down to fit them. Off, or 0 rows, leaves the heading where it is.

```js
PLAY_SPACE_ABOVE_HEADING = true
PLAY_ROWS_ABOVE_HEADING = 1
```

Figures step aside from the heading and words, leaving this much space.

```js
PLAY_TEXT_CLEARANCE = 24
```

```js
PLAY_ROWS_AFTER_TEXT = 1
```

```js
PLAY_BOTTOM_PADDING = 20
```

A question mark on the outlined figure, in PLAY_HEADING_FONT. Its size and distance from the top are percentages of the figure's height (36 = about chest height).

```js
PLAY_QUESTION_MARK = false
PLAY_QUESTION_MARK_SIZE = 30
PLAY_QUESTION_MARK_FROM_TOP = 36
```

The outlined figure's line thickness, and which figure it is:

- "random" picks a different one each visit.
- "middle" is the one in the middle of the page.
- A number counts across the rows from the top left, starting at 0.

```js
PLAY_OUTLINE_THICKNESS = 3
PLAY_OUTLINE_WHICH = "middle"
```

The menu bar on this page: its color, and its outline (thickness 0 = none).

```js
PLAY_MENU_BACKGROUND = "#ffffff"
PLAY_MENU_OUTLINE_COLOR = "#000000"
PLAY_MENU_OUTLINE_THICKNESS = 2
```

Fonts for this page, named exactly as on fonts.google.com. Empty ("") = the site's usual font.

```js
PLAY_HEADING_FONT = "Lexend"
PLAY_BODY_FONT = "Crimson Text"
PLAY_HEADING_FONT_WEIGHT = 600
PLAY_BODY_FONT_WEIGHT = 500
```

## Things built separately

Things built on their own (like the explorations wheel) are shown in a section by writing their name between exclamation marks on a line of its own: `!wheel!`. Each runs in its own frame, so it can't affect the rest of the page. A name not listed here shows as plain words.

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

The RSVP box's `settings`, for after an RSVP goes through:

- `confetti` — `false` for none. `confettiPieces`: how many; `confettiMs`: how long they last.
- `thankYou` — words that roll down under the boxes (empty for none). `thankYouMs`: how long they stay (0 = they stay up); `dropMs`: how long the roll takes.

An entry is either just a file, or a file with details:

- `file` — the file. Always needed.
- `height` — its frame's height, instead of EMBED_HEIGHT.
- `touch` — `"always"` = usable straight away (for something you fill in). `"wake"` = waits under a label until clicked (for a map or a wheel). Left out = to look at, not touch.
- `label` — the label for `"wake"`, instead of EMBED_WAKE_LABEL.
- `settings` — handed on to the embed.

Embeds are to look at by default: scrolling over one scrolls the page. Ones named here wait under EMBED_WAKE_LABEL and work once clicked, until the pointer leaves.

```js
EMBEDS_YOU_CAN_TOUCH = ["map"]
EMBED_WAKE_LABEL = "Click to use the map"
```

The frame's height. Its width matches the words around it.

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

```js
MENU_TITLE_IN_ACCENT_COLOR = false
```

The menu bar across the top, shown once the main menu scrolls away.

```js
TOP_MENU_HEIGHT = 64
TOP_MENU_TEXT_SIZE = 17
```

Letter spacing while hovered, as a fraction of the letter size (at rest it uses MENU_LETTER_SPACING_HOVER).

```js
TOP_MENU_HOVER_LETTER_SPACING = 0.5
TOP_MENU_HOVER_SPEED_MS = 250
```

```js
TOP_MENU_UNDERLINE_ON_HOVER = false
TOP_MENU_UNDERLINE_THICKNESS = 2
```

While gliding to a section above, the chosen option's underline becomes an arrow pointing up. Size = the length of each side.

```js
TOP_MENU_ARROW_WHEN_MOVING_UP = false
TOP_MENU_ARROW_SIZE = 10
```

The menu bar slides in and out, or appears instantly.

```js
TOP_MENU_ANIMATION = true
```

```js
TOP_MENU_SLIDE_MS = 350
```

A clicked menu option glows briefly.

```js
MENU_CLICK_GLOW = false
MENU_CLICK_GLOW_COLOR = "#ffffff"
MENU_CLICK_GLOW_MS = 1200
```

A chosen menu option's letters jump to scattered heights until the page reaches its section.

```js
MENU_CLICK_NUDGE = false
```

How far, as a fraction of the letter size.

```js
MENU_CLICK_NUDGE_AMOUNT = 0.25
```

```js
MENU_CLICK_NUDGE_SPEED_MS = 150
```

The chosen option's letters also spread apart until it arrives, by this fraction of the letter size.

```js
MENU_CLICK_EXPAND = true
MENU_CLICK_EXPAND_AMOUNT = 0.12
```

The chosen option's word also moves toward its section (down or up) until it arrives, by this fraction of the letter size.

```js
MENU_CLICK_MOVE_TOWARD_SECTION = true
MENU_CLICK_MOVE_AMOUNT = 0.4
```

The menu bar's first option.

```js
TOP_MENU_HOME_LABEL = "Home"
```

On phones, a menu button in the top-left corner takes the menu bar's place and slides the options out from the left, at TOP_MENU_SLIDE_MS (instant when TOP_MENU_ANIMATION is off). Off keeps the bar on phones too.

```js
PHONE_MENU = true
```

Screens narrower than this get the button. Zooming in on a computer doesn't count.

```js
PHONE_MENU_BELOW_WIDTH = 640
```

```js
PHONE_MENU_BUTTON_SIZE = 56
PHONE_MENU_WIDTH = 280
PHONE_MENU_TEXT_SIZE = 20
```

## Fonts & menu

```js
MENU_TITLE = "The School From Scratch"
```

Empty ("") for none.

```js
MENU_SUBTITLE = "An Educational Commons for students, teachers, parents, and other learners."
```

A small accent-colored notice under the title, for something passing like a play. Empty ("") hides it. **bold** and *italic* work. The link can be a page ("play.html"), a home page section ("#cost"), a web address, or an email ("mailto:hello@example.org"); empty = no link.

```js
HOME_NOTICE = "The School From Scratch is producing the play *Is Nirmal Normal?* Click to learn more!"
HOME_NOTICE_LINK = "is_nirmal_normal.html"
```

Its text size, and the space above it.

```js
HOME_NOTICE_TEXT_SIZE = 18
HOME_NOTICE_GAP = 20
```

The menu options, top to bottom.

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

Options that open an address instead of a section: a page on this site ("payments.html") or a web address. Names exactly as in the menu. These need no section file.

```js
MENU_LINKS = {
  "Payments": "payments.html",
  "Contact": "contact.html",
  "TEC": "https://www.transformativeeducationcenter.com/",
}
```

Options only in the menu bar, after the others. Their addresses come from MENU_LINKS.

```js
TOP_MENU_EXTRA_ITEMS = [
  "Payments",
  "Contact",
  "TEC",
]
```

Fonts from fonts.google.com, named exactly as there. Weight: 400 = regular, 500 = medium, 600 = semi-bold, 700 = bold (if the font has it).

The heading font is for the title.

```js
HEADING_FONT = "Lora"
HEADING_FONT_WEIGHT = 600
```

Everything else: the menu options and the menu bar.

```js
BODY_FONT = "Quicksand"
BODY_FONT_WEIGHT = 500
```

HEADING_FONT_SIZE is for headings on the separate pages, BODY_FONT_SIZE for the menu options. Both shrink on narrow screens.

```js
HEADING_FONT_SIZE = 64
BODY_FONT_SIZE = 24
```

The home title and the line under it. Both shrink on narrow screens.

```js
MENU_TITLE_SIZE = 76
MENU_SUBTITLE_SIZE = 24
```

```js
SUBTITLE_GAP = 16
```

Space between the title (or the line under it) and the menu options.

```js
TITLE_GAP = 50
```

Letter spacing of the menu options at rest and on hover, as a fraction of the letter size (0 = normal).

```js
MENU_LETTER_SPACING = 0.55
MENU_LETTER_SPACING_HOVER = 0.15
```

How far each letter is nudged up or down before settling on hover, as a fraction of the letter size (0 = in line).

```js
MENU_LETTER_OFFSET = 0.15
```

A whole number keeps the same nudges every visit; `random` changes them each visit.

```js
MENU_LETTER_SEED = random
```

Turn off either part of the hover movement: spreading sideways, or nudging up and down.

```js
MENU_LETTERS_SPREAD_SIDEWAYS = true
MENU_LETTERS_NUDGE_UP_DOWN = false
```

On: letters rest tidy and spread out on hover. Off: the reverse.

```js
MENU_HOVER_EXPANDS = true
```

Underline on hover, growing from the middle once the letters have settled, after this extra delay.

```js
MENU_UNDERLINE_ON_HOVER = false
MENU_UNDERLINE_DELAY_MS = 10
MENU_UNDERLINE_SPEED_MS = 200
MENU_UNDERLINE_THICKNESS = 3
```

How long the letters take to settle.

```js
MENU_HOVER_SPEED_MS = 150
```

On: every letter moves at the same speed, so long options take longer. Off: every letter takes exactly MENU_HOVER_SPEED_MS.

```js
MENU_LETTERS_EVEN_SPEED = false
```

Each letter starts up to this much later than the others. 0 = all at once.

```js
MENU_LETTER_STAGGER_MS = 0
```

## Pages

Each menu option scrolls to its section on the home page. A missing or empty section shows "Under Development".

Two-column lists (`Role — Name`): the space between the two columns.

```js
TWO_COLUMN_GAP = 64
```

What shows between the two columns (the em dash you type always marks the split):

- `false` or `""` = nothing.
- `true` = an em dash (—).
- Any characters in quotes: `"–"`, `"·"`, `":"`.

```js
TWO_COLUMN_DASH = true
```

In explore mode, or with the gallery off, each option opens a page of its own instead.

Room for photos between sections (and between the menu and the first section).

```js
SPACE_BETWEEN_SECTIONS = 550
```

Photos thin out from the first section to none over this distance, shaped by FADE_CURVE. It stretches if the sections are longer.

```js
SECTION_PHOTO_THIN_OUT_DISTANCE = 10500
```

Gap between a section's text and the nearest photo.

```js
SECTION_PHOTO_CLEARANCE = 40
```

```js
SECTION_TEXT_WIDTH = 720
```

Widest the paragraphs and lists can be. 0 = the full SECTION_TEXT_WIDTH. 480 to 620 keeps lines easy to read.

```js
SECTION_PARAGRAPH_WIDTH = 0
```

```js
SECTION_HEADING_SIZE = 44
SECTION_TEXT_SIZE = 19
```

```js
SECTION_PICTURE_WIDTH = 250
```

0 = each picture keeps its shape. Any other number makes every picture that tall, cropped to the middle, so a row of headshots lines up.

```js
SECTION_PICTURE_HEIGHT = 0
```

Menu options (and Home) glide to their section, or jump straight there.

```js
SECTION_LINKS_SCROLL_SMOOTHLY = true
```

How long the glide takes, however far. (Home uses HOME_TRAVEL_MS.)

```js
SECTION_SCROLL_MS = 1000
```

Where a section's heading lands, measured from the top of the screen.

```js
SECTION_SCROLL_MARGIN = 96
```

Sections that show the phone number (and the Venmo logo, if on). Names exactly as in MENU_ITEMS. Empty ([]) = none.

```js
CONTACT_PAGES = []
```

Empty ("") hides it.

```js
PHONE_NUMBER = "+1 (805) 798-5098"
```

```js
SHOW_VENMO_LOGO = false
```

Where the Venmo logo leads (https://…). Empty ("") = no link.

```js
VENMO_LINK = ""
```

## Payments page (payments.html)

Details left empty show as a [bracketed placeholder].

The Zelle tag (or the email or phone it's registered to), and the name parents will see.

```js
ZELLE_RECIPIENT = "transformativeedu26"
ZELLE_RECIPIENT_NAME = "The School From Scratch"
```

```js
PAYMENTS_TEXT_FILE = "sections/payments/payments.md"
```

```js
SHOW_ZELLE_LOGO = false
```

The logo file and its width. Empty ("") shows the word "Zelle" instead. The official logo is on zellepay.com, under "Brand guidelines".

```js
ZELLE_LOGO = "assets/Zelle_logo.svg"
ZELLE_LOGO_WIDTH = 240
```

```js
PAYMENT_STEP_CIRCLE_SIZE = 36
PAYMENT_STEP_SPACING = 28
```

## Page not found (404.html)

Pushing any character sets them all loose: they fall, spin, bounce and pile up, each shaped like its character.

```js
NOT_FOUND_PUSHABLE_NUMBERS = true
```

Pull downward, in pixels per second per second (2600 ≈ real weight; 0 = floating).

```js
NOT_FOUND_GRAVITY = 2200
```

0 = a thud, 0.55 = a few bounces, 0.9 = very lively.

```js
NOT_FOUND_BOUNCE = 0.35
```

Speed of a push, in pixels per second (700 = a firm shove, 300 = gentle).

```js
NOT_FOUND_PUSH = 700
```

A push spreads out and fades with distance; characters beyond this reach stay put. Once they're loose, a push anywhere counts.

```js
NOT_FOUND_PUSH_REACH = 260
```

The first push reaches the whole page, this many times stronger (1 = normal).

```js
NOT_FOUND_FIRST_BLAST = 1.25
```

Holding a click (or dragging) picks a character up instead: it swings from the pointer and is thrown on release. How long to hold, and grip from 0.01 (loose) to 1 (stuck to the pointer).

```js
NOT_FOUND_HOLD_TO_PICK_UP_MS = 150
NOT_FOUND_DRAG_GRIP = 0.2
```

How quickly they stop sliding: 0 = like ice, 1 = almost at once.

```js
NOT_FOUND_FLOOR_GRIP = 0.6
```

Each character's shape is built from squares this many pixels across: 5 = fine, 7 = middle, 12 = blocky. Smaller is more work for the browser.

```js
NOT_FOUND_SHAPE_DETAIL = 7
```

Gap kept between the characters and the page edges (and the menu bar).

```js
NOT_FOUND_EDGE_SPACE = 10
```

## Background grid

A faint grid behind everything. With the gallery on, it moves with the photos.

```js
GRID_ENABLED = false
```

```js
GRID_SQUARE_SIZE = 50
```

The last number is how visible the lines are: 0.05 to 0.12 keeps it subtle.

```js
GRID_LINE_COLOR = "rgba(255, 255, 255, 0.07)"
```

```js
GRID_LINE_THICKNESS = 3
```

```js
GRID_FADES_AT_EDGES = false
```

## Performance

A panel in the top-right corner: frames per second, a frame-time graph, memory and more. P hides or shows it, and Ctrl+P opens it even when this is off. Turn it off before publishing.

```js
SHOW_PERFORMANCE_INFO = false
```

```js
SHOW_PERFORMANCE_RATING = false
```

When zoomed out, draw areas of photos once and reuse them: much smoother, though edge photos may take a moment to appear after a big zoom.

```js
SPEED_UP_ZOOMED_OUT_VIEW = true
```

Draw slightly less sharply on high-resolution screens while moving, then sharpen when stopped.

```js
LOWER_RESOLUTION_WHILE_MOVING = true
```

## The admin page (/admin)

Classic layout only. Empty ("") uses MENU_TITLE.

```js
ADMIN_TITLE = "The School From Scratch "
```

Classic layout only. Empty ("") for none.

```js
ADMIN_SUBTITLE = "Editing the website. Choose a page below to change its text, or go to 'settings' to change everything else."
```

Classic layout only.

```js
ADMIN_SPACE_BETWEEN_SECTIONS = 160
```

What the admin calls its Settings, Menu and Photos.

```js
ADMIN_SETTINGS_LABEL = "Settings"
```

```js
ADMIN_MENU_LABEL = "Menu"
```

```js
ADMIN_PHOTOS_LABEL = "Photos"
```

How the admin is laid out. /admin/?layout=site or /admin/?layout=classic picks one for a single visit.

- `"site"` = the website itself: click things to edit them; everything else is under the gear.
- `"classic"` = the earlier layout: the menu at the top and every page's words in a list.

```js
ADMIN_LAYOUT = "site"
```

Empty ("") follows ACCENT_COLOR.

```js
ADMIN_GEAR_COLOR = "#dfeac0"
```

A thin outline round the gear and its "Settings" label:

- `"always"` = always outlined.
- `"over the bar"` = only while the menu bar is behind the gear.
- `"never"` = no outline.

```js
ADMIN_GEAR_OUTLINE = "over the bar"
```

The gear's panel slides in, or just appears.

```js
ADMIN_PANEL_SLIDE_IN = false
```

The hover outline on editable things fades in, or appears at once.

```js
ADMIN_OUTLINE_FADE = false
```

The panel's names spread their letters on hover like the menu bar's options, by TOP_MENU_HOVER_LETTER_SPACING at TOP_MENU_HOVER_SPEED_MS.

```js
ADMIN_TABS_SPREAD_LETTERS = true
```

The arrow beside each settings group turns smoothly, or just flips.

```js
ADMIN_SETTINGS_ARROW_ANIMATION = false
```

The on/off switches slide, or just flip.

```js
ADMIN_SWITCH_ANIMATION = false
```

The Save & Publish box rises into place, or just appears.

```js
ADMIN_PUBLISH_BOX_ANIMATION = false
```

# TW-1077 Community tab: roster note

Every ink figure in the village is a person from the demo's fictional
sample family, drawn from the birth year on their home tree card.
Adult dress is figured at birth year plus 25, the decade of their
young adulthood. Dress follows the era convention for the name as
given in the sample tree. Props are era-typical for the figure's
decade, never person-specific claims. Where a tree card gives no
year, a figure would stay era-neutral; every villager on the roster
below carries a documented sample year, so no era-neutral call was
needed in this slice.

## The roster is data-driven (TW-1155)

The village layer holds no names, years, or lineage facts in code.
Its single data source is `villagers-data.js` at the repo root:
records with a status per fact (documented, probable, lead,
unknown), mirroring the demo's people records in
tools/build_journey.py. The layer derives the rest by rule: era
dress only from a documented year; homes from the record's line;
rounds from a template by roster order; the night keepers are the
three youngest documented villagers. A record whose year is
probable, lead, or missing renders era-neutral, and the roster
labels the year for what it is, never as settled fact. The
capture harness proves the swap: flipping one record's status to
probable at the data layer only, with no code change, renders
that villager in the neutral kit with the year labeled probable.
When the real lineage pack (TW-1155) lands, it replaces the
records in that one file in the same schema.

| Villager | Born | Drawn for | Kit, hat, prop |
| --- | --- | --- | --- |
| Amos Shote | 1831 | the 1850s | frock coat and waistcoat, wide-brim hat, cane |
| Celia Shote | 1836 | the 1860s | long gown with apron, bonnet, market basket |
| Ruth Shote | 1858 | the 1880s | full gown, wide-brim hat |
| Henry Shote | 1861 | the 1880s | sack suit, bowler |
| Della Shote | 1864 | the 1880s | gown, brimmed hat, book |
| Moses Shote | 1867 | the 1890s | suit, derby, cane |
| Ada Shote | 1883 | the 1900s | blouse and long skirt, wide hat |
| Booker Shote | 1890 | the 1910s | jacket, flat cap |
| Lena Shote | 1929 | the 1950s | full-skirt dress, hair in a bun |
| Emmett Shote | 1930 | the 1950s | slacks and short-sleeved shirt, fedora |
| Sadie Shote | 1956 | the 1980s | blouse and straight trousers |
| Jordan Shote | 1972 | the 1990s | jeans and a jacket |
| Amara Shote | 1985 | the 2010s | plain modern dress |
| Xavier Shote | 2001 | the 2020s | hoodie and jeans |

## Rounds (routes)

Each villager walks a round: their ordinary day, out from their
home door and back. The scene signs name the four rounds (the
homeplace round, the church round, the store round, and the road
to town). Pointing at a villager lights their round in gold;
tapping one holds the light for a breath, then goes straight to
the profile page.

| Villager | Round stops |
| --- | --- |
| Amos | cabin, oak shade, well, church |
| Celia | cabin, well, store, church |
| Ruth | farmhouse, well, church, store |
| Henry | brick house, store, well, garden |
| Della | cabin, church, well, bench |
| Moses | brick house, bench, well, store |
| Ada | farmhouse, garden, store, well |
| Booker | brick house, store, garden, bench |
| Lena | farmhouse, oak shade, well, church |
| Emmett | brick house, well, store, church |
| Sadie | farmhouse, well, church, store |
| Jordan | brick house, store, well, garden |
| Amara | farmhouse, church, well, bench |
| Xavier | brick house, bench, well, store |

## Transport

The road carries one vehicle at a time, in era rotation, all
drawn as plain unbranded ink shapes: a horse and buggy with a
driver, an early motorcar of the Model T years (tall box body,
spoked wheels, folded top), a long sedan of the 1970s, and a
generic modern sport utility shape. No badges, names, or logos
appear on any of them. In the still village all four stand parked.

## Era-neutral and staging calls

- The five dwellings (log cabin, church, farmhouse, store, brick
  house), the well, the market stall, the garden, and the bench
  are era-typical for the family's documented span, 1831 to the
  present. They are the village's furniture, not tied to any one
  person's record.
- The waypoint signs name rounds and their era decades; they are
  scene dressing for the fictional village, not records.
- Home doors are staging: a villager's round starts at the door
  nearest their line's cluster. No dwelling is claimed as any
  person's historical home.
- The day phase follows the visitor's own clock (dawn, morning,
  midday, afternoon, dusk, night). At night most villagers go
  home; the three youngest keep the road.

Prepared by Twistor Holdings LLC

// src/data/glossaryTerms.js
// Uranium-glass glossary content, sourced from the studio's "Glossary of Terms"
// reference document. Each entry: { term, def, category, sub?, links? }.
//   sub   - labelled sub-definitions (e.g. rhinestone grades)
//   links - related external reference URLs
// Consumed by src/pages/Glossary.jsx, which renders and filters these client-side.

export const CATEGORY_ORDER = [
  "Identifying uranium glass",
  "Types of glass",
  "Jewelry & collecting basics",
  "Historical periods & styles",
  "Gems, stones & cuts",
  "Findings & construction",
  "Metals",
  "Makers & designers"
]

export const GLOSSARY_TERMS = [
  {
    "term": "Uranium",
    "def": "The chemical element of atomic number 92, a dense gray radioactive metal used as a fuel in nuclear reactors. Uranium in dioxide form is used in a small amount in uranium glass.",
    "category": "Identifying uranium glass"
  },
  {
    "term": "Black Light",
    "def": "Ultraviolet light used to identify uranium glass.",
    "category": "Identifying uranium glass"
  },
  {
    "term": "Longwave UV",
    "def": "The wavelength of commercial blacklights, and the wavelength used to identify uranium glass. Ranges from 320 nanometers (nm) to 400nm. Most commercial blacklights come in either 365nm or 395nm. For the purposes of uranium glass jewelry, only 395nm blacklights should be used. 365nm can misidentify other materials such as manganese and cubic zirconia as uranium glass.",
    "category": "Identifying uranium glass"
  },
  {
    "term": "Shortwave UV",
    "def": "A blacklight with a wavelength of 254nm. For scientific and gemological use only. Not for commercial use. It can damage your eyesight if used incorrectly. Not used to identify uranium glass. Some gems and minerals can fluoresce under shortwave and not longwave and vice versa. Some gems and minerals can fluoresce different colors depending on if it's under short or longwave.",
    "category": "Identifying uranium glass"
  },
  {
    "term": "Geiger counter",
    "def": "Measurement tool used to measure radiation levels. Measures in counts-per-minute (cpm) or microsieverts per hour (mSv/h). Can sometimes be a helpful tool in identifying uranium glass in jewelry, but it may not be sensitive enough to measure small amounts. A measurement over 50cpm is considered radioactive and positively identifies uranium glass.",
    "category": "Identifying uranium glass"
  },
  {
    "term": "Uranium glass",
    "def": "Uranium glass is glass made with up to 2% uranium dioxide for color. The uranium content causes the glass to fluoresce bright green under a UV blacklight. Has slight radioactivity that can be measured with a Geiger counter. The manufacturers of uranium glass did not know that uranium would have the prized characteristic of being blacklight reactive.",
    "category": "Types of glass"
  },
  {
    "term": "Vaseline glass",
    "def": "Uranium glass in a bright yellow color, named after early Vaseline petroleum jelly due to it's similar color. The term vaseline glass refers to this specific color of uranium glass, however, the term is sometimes erroneously applied to all uranium glass. Uranium glass in other colors not the bright yellow are not vaseline. All vaseline glass is uranium, but not all uranium glass is vaseline.",
    "category": "Types of glass"
  },
  {
    "term": "Custard glass",
    "def": "An opaque glass with an creamy yellow-white ivory hue. Originally made in England by Sowerby in the late 19th century, the term \"custard glass\" was popularized after being mass-produced by Fenton due to it's similar color to custard dessert. Most, but not all, custard glass contains uranium. Custard glass in jewelry was mainly produced in Czechoslovakia during the 1920s/30s.",
    "category": "Types of glass"
  },
  {
    "term": "Milk glass",
    "def": "Bright white opaque glass that resembles milk. A brighter white than custard glass. Can sometimes be uranium but is usually not. It's unusual to find uranium milk glass in jewelry.",
    "category": "Types of glass"
  },
  {
    "term": "Jadite glass",
    "def": "A jade green opaque glass. Extremely collectible. Made in glassware by Fire King and Anchor Hocking, which are not uranium glass - and Jeannette and McKee, whose jadite is uranium glass. Jadite can sometimes be found in uranium glass jewelry. Popular with artisan jewelry makers who use broken jadite in their pieces.",
    "category": "Types of glass"
  },
  {
    "term": "Opaline glass",
    "def": "An opaque or semi-translucent richly-colored glass with a high lead content. Most opaline glass is French or Bohemian. Elegant in design and commonly made with gold embellishments and/or patterned enamel. Green and yellow opaline can be uranium glass. It's difficult to label any uranium glass in jewelry as opaline specifically.",
    "category": "Types of glass"
  },
  {
    "term": "Illuminati glass",
    "def": "Modern borosilicate glass with uranium used by glass artisans to make smoking pipes and \"heady glass\" jewelry. Jewelry pieces featuring Illuminati glass are psychedelic in style. Still made but very expensive. A similar glass called Citrine is made by Molten Aura Labs.",
    "category": "Types of glass"
  },
  {
    "term": "Cadmium glass",
    "def": "Cadmium glass will fluoresce bright orange under a UV blacklight. It is not radioactive. Sometimes erroneously referred to as manganese glass. Can be found in jewelry. Cadmium is found in both red and yellow pigments.",
    "category": "Types of glass"
  },
  {
    "term": "Selenium glass",
    "def": "Selenium glass will fluoresce bright pink under a UV blacklight. It is not radioactive. Can be found in jewelry but it's uncommon.",
    "category": "Types of glass"
  },
  {
    "term": "Manganese glass",
    "def": "Glass made with manganese that will fluoresce a dull green under a blacklight. It is not radioactive and is sometimes mistaken for uranium glass. Manganese glass will glow a very dull grass green, or may glow bright but with only a very slight green hue. It is most often found in clear, pink, and purple glass. Can be found in jewelry but is not sought-after. Sometimes erroneously applied to orange-fluorescing glass (which is cadmium glass).",
    "category": "Types of glass"
  },
  {
    "term": "Lead glass",
    "def": "glass with a high lead content and low iron content. Also know as lead crystal. The lead is added to provide extra clarity. This will often fluoresce blue. Can be found in jewelry but is not sought-after.",
    "category": "Types of glass"
  },
  {
    "term": "Neodymium glass / alexandrite glass",
    "def": "Glass made to imitate the color-changing nature of alexandrite gemstones. It changes from pink to purple to blue depending on if it's in incandescent, fluorescent, or sunlight respectively. Found rarely in jewelry but is popular in vintage art glass and glassware. Neodymium glass can sometimes glow pinkish-red under a blacklight.",
    "category": "Types of glass"
  },
  {
    "term": "Depression glass",
    "def": "Glassware made from 1929-1939. A good deal of uranium glassware was made during this period. Some purist collectors believe that uranium glass isn't real uranium glass unless it was made during this period, but for most collectors uranium glass is simply glass that is made with uranium as a colorant.",
    "category": "Types of glass"
  },
  {
    "term": "Cullet",
    "def": "A large chunk of broken glass left over from the manufacturing process.",
    "category": "Types of glass"
  },
  {
    "term": "Slag glass",
    "def": "Marbled glass with streaks of different colors mixed up together. In jewelry this is referred to as end-of-day glass (see below).",
    "category": "Types of glass"
  },
  {
    "term": "Enamel",
    "def": "Fine-ground powdered glass that is fired onto metal jewelry. Also known as vitreous enamel. Sometimes the ground glass that was used can be uranium but it is rare to find in jewelry. Sometimes \"enamel\" can actually be paint and therefore can glow due to the polymers in it rather than uranium.",
    "category": "Types of glass"
  },
  {
    "term": "Uranium glaze",
    "def": "a finish applied to some pottery and ceramics that has uranium and is highly radioactive. Sometimes this finish can glow green under a blacklight, but not because it is uranium glass. The most well-known of pieces made with this glaze is Fiestaware.",
    "category": "Types of glass"
  },
  {
    "term": "Costume jewelry",
    "def": "Jewelry made with inexpensive materials and imitation gems.",
    "category": "Jewelry & collecting basics"
  },
  {
    "term": "Fine jewelry",
    "def": "Jewelry made with precious metals such as gold, silver, and platinum which may or may not include precious or semi-precious gems. Uranium glass can be found in silver, but is much less likely to found in gold. Uranium glass is not found in platinum unless set on purpose for a collector of uranium glass jewelry interested in fine jewelry pieces.",
    "category": "Jewelry & collecting basics"
  },
  {
    "term": "Signed/unsigned",
    "def": "Signed jewelry has the hallmark of the designer stamped into the back or on a cartouche attached to the piece. With unsigned jewelry, identifiable hallmarks are not present. It can sometimes be identified by it's construction or with the help of identification books.",
    "category": "Jewelry & collecting basics"
  },
  {
    "term": "Parure / Demi-parure",
    "def": "A set of jewels intended to be worn together. A parure is regarded as a complete set, inclusive of a necklace, earrings, bracelet, and brooch. A demi-parure is missing one or more of those items. A grand parure is a parure that includes a tiara or diadem.",
    "category": "Jewelry & collecting basics"
  },
  {
    "term": "Vintage",
    "def": "The definition of what's considered vintage is contentious, but is generally assumed to be older than 20 years by some definitions, and older than 30 years by others.",
    "category": "Jewelry & collecting basics"
  },
  {
    "term": "Antique",
    "def": "Older than 100 years",
    "category": "Jewelry & collecting basics"
  },
  {
    "term": "Vintage-style / antique-style",
    "def": "A contemporary piece of jewelry made in to look vintage or antique.",
    "category": "Jewelry & collecting basics"
  },
  {
    "term": "Georgian",
    "def": "Art and culture period that covered the reigns of five English kings and lasted from 1714 to 1837. Georgian jewelry is defined by high-quality labor-intensive craftsmanship, closed-back settings, and foil-backed gems to increase their beauty under candlelight. Currently there are no known Georgian jewelry pieces with uranium glass. There is a possibility for such a discovery to occur however, as uranium glass production began at the end of the Georgian period, and jewelry craftsmen at that time were producing fabulous hand-cut glass jewelry in gold and silver.",
    "category": "Historical periods & styles"
  },
  {
    "term": "Victorian",
    "def": "the period of Queen Victoria's reign from 20 June 1837 to her death on 22 January 1901. Queen Victoria was extremely influential on jewelry trends during the period. A person's identity and status were closely related to their jewelry during this time. The subject of Victorian jewelry is incredibly diverse and a further read is recommended for those interested in the subject Only a handful of Victorian uranium glass jewelry pieces have been identified so far.",
    "links": [
      "https://en.m.wikipedia.org/wiki/Victorian_jewellery"
    ],
    "category": "Historical periods & styles"
  },
  {
    "term": "Belle Époque",
    "def": "A period of French and Continental Europe between the 1870s and the outbreak of WWI in 1914. A particulary rich cultural and artistic climate was in effect in France during this time. Belle Époque jewelry is characterized by garlands, foliate motifs, lace and bows. Tiaras were popular during this time. Belle Époque jewelry is particularly opulent, however, they did use paste glass stones in some costume pieces, and some Belle Époque uranium glass jewelry pieces have been identified.",
    "category": "Historical periods & styles"
  },
  {
    "term": "Arts and Crafts Movement (1890-1910)",
    "def": "A response against the use of machines, therefore, all Arts and Crafts jewelry is all hand-fabricated from start to finish by a single artisan.The fundamental style of the Arts & Crafts Movement was that of entwined motifs and undulating lines, beginning an aesthetic that would eventually lead to the Art Nouveau movement. Cabochons were almost entirely used, and never diamonds. Glass was used periodically by artisans, and so far a handful of Arts and Crafts pieces with uranium glass have been identified. The Arts and Crafts Movement has a very interesting history and philosophy for those interested",
    "links": [
      "https://www.langantiques.com/university/arts-crafts-era-jewelry/"
    ],
    "category": "Historical periods & styles"
  },
  {
    "term": "Art Nouveau (1895-1910)",
    "def": "Jewelry makers of the Art Nouveau period strived to capture the movement of nature in wearable works of art. Fluid lines and asymmetrical patterns were common motifs. Female forms and nature scenes, including flowers, insects, lizards, and snakes, often graced jewelry pieces from this period. Since the original movement, art nouveau has become a recognizable style throughout the decades and even in contemporary jewelry. So far no original art nouveau jewelry pieces containing uranium glass have been identified, but we can credit Alphonse Mucha, who used glass in his gold jewelry, for seeing and understanding the beauty of glass in jewelry as precious as any gemstone.",
    "category": "Historical periods & styles"
  },
  {
    "term": "Edwardian (1901-1915)",
    "def": "Named for Edward VII, the heir of Queen Victoria. Edwardian jewelry is recognized by it's lacy, floral filigree and milgrain while incorporating a lot of the color white - platinum and white gold, pearls and diamonds. Glass was regularly used in Edwardian costume jewelry pieces, and this period is when the use of uranium glass in jewelry began rapidly emerging.",
    "category": "Historical periods & styles"
  },
  {
    "term": "Egyptian Revival",
    "def": "This movement began with Napoleon's conquest of Egypt in 1798, and dramtically increased in popularity when the world was dazzled by the discovery of King Tut's tomb in November 1922. Egyptian motifs exploded in fashion and design, and jewelry saw no exception. The 1920s and 1930s saw a perfect blend of Egyptian Revival and Art Deco. Glass jewelry designers in Czechoslovakia at the time produced marvelous jewelry and beads with motifs such as scarabs, pharaohs, mummies, and heiroglyphs. Many of these pieces, particularly the beads, were uranium glass. The most well-known jewelry artisan producing these pieces during this period were the Neiger Brothers, whose uranium glass Egyptian Revival beads were and still are unparalleled in quality and craftsmanship.",
    "category": "Historical periods & styles"
  },
  {
    "term": "Art Deco (1920s-1930s)",
    "def": "The Golden Age of uranium glass jewelry. Art Deco is characterized by bold repeating geometric forms and bright contrasting colors. The Art Deco period coincided with the height of the glass jewelry industry in Czechoslovakia, who at the time was mass producing glass pieces and beads to be used in jewelry, a good amount of which was uranium glass. This period in Czech also saw the manufacture of fabulous and well-crafted costume jewelry pieces by master jewelry artisans who were trained like goldsmiths and applied their craft to glass and brass. Most and arguably the best vintage uranium glass jewelry comes from this time period. Art deco is one of the most recognizable and popular jewelry styles, and deco-style pieces are still made today.",
    "category": "Historical periods & styles"
  },
  {
    "term": "Modernist / Mid-century modern or MCM / Machine Age (1940s-1960s)",
    "def": "An avant garde movement defined by a change in design as a response to changes in technology and society. This period saw ornamentation replaced by simple, clean lines. Modernist jewelry is very sculptural, abstract, and daring, inspired by Cubism and Surrealism. The movement was led by Scandanavian jewelry designers. Production of uranium glass ceased during this period so uranium glass jewelry will not be found in modernist jewelry. However, some MCM pieces do feature green fluorescing spinels.",
    "category": "Historical periods & styles"
  },
  {
    "term": "Brutalist",
    "def": "An offshoot of Modernist jewelry. A radical style typified by massive, jagged, tactile, and highly abstract designs. Unconventional materials were often used, therefore it is possible to find uranium glass in pieces from the 1970s and 80s. Wonderful fluorescing spinels can be found in fine gold Brutalist pieces.",
    "category": "Historical periods & styles"
  },
  {
    "term": "Retro / Atomic / Space Age (1960s)",
    "def": "A type of modernist jewelry with a very futuristic feel. A comparable aesthetic would be the cartoon The Jetsons. This jewelry was inspired by the exploration of space and the popularity of nuclear power. These pieces usually feature a sputnik inspired by the USSR satellite, or starburst resembling a model of an atom. Despite it's relevancy, this movement also occurred at a time when uranium glass was not being manufactured.",
    "category": "Historical periods & styles"
  },
  {
    "term": "Rhinestone Mid-Century (1950s-1970s)",
    "def": "This period saw the popularity of beautiful glass rhinestone costume jewelry. These pieces were mass produced in varying qualities. Some were cheap, but some were high-end designer. A great time-period for uranium glass rhinestone pieces, particularly brooches.",
    "category": "Historical periods & styles"
  },
  {
    "term": "Contemporary (1980s-present)",
    "def": "Contemporary jewelry of the last 30 years has little to no uranium glass. While it appeared somewhat in the 1980s, almost no jewelry from the 1990s and 2000s has it. The 1990s saw the shutdown of the last of the uranium manufacturing plants in the United States, so now uranium glass is only produced in small batches of beads in Czech Republic. The past few years have seen a marked increase of interest in collecting uranium glassware, with a very recent garnering of interest in uranium glass jeweley specifically. Uranium glass jewelry is now produced by independent artisans and continues to gain in popularity, especially amongst younger collectors.",
    "category": "Historical periods & styles"
  },
  {
    "term": "Chysoprase glass",
    "def": "A dark green glass made to imitate chysoprase stone. Can sometimes be uranium glass, particularly if it's vintage.",
    "category": "Types of glass"
  },
  {
    "term": "Carnelian glass",
    "def": "A red glass made to imitate carnelian stone. Can be found as uranium glass but uncommon.",
    "category": "Types of glass"
  },
  {
    "term": "Satin glass",
    "def": "In jewelry, satin glass referred to beads and cabochons with a shimmery finish.",
    "category": "Types of glass"
  },
  {
    "term": "Foil glass",
    "def": "Glass that has metal foil submerged under the glass for a fiery look.",
    "category": "Types of glass"
  },
  {
    "term": "Murano glass",
    "def": "Glass made on the island of Murano in Venice, Italy. It is unusual to find uranium glass in Murano jewelry pieces.",
    "category": "Types of glass"
  },
  {
    "term": "End-of-day glass",
    "def": "An item made by the glassworkers on their own time at the end of the day using up the molten glass remaining in the pots. It therefore tends to be a mixture of all sorts of colors.",
    "category": "Types of glass"
  },
  {
    "term": "Opalescent glass",
    "def": "Glass made with an opal-like finish, generally semi-translucent, and sometimes with flashes of two or more colors.",
    "category": "Types of glass"
  },
  {
    "term": "Pressed glass",
    "def": "Glass that is pressed into a mold while still molten in order to form a pattern in the glass. Extremely popular in 1920s/1930s Czechoslovakia at the same time uranium glass pieces were made in large quantities, therefore, lots of uranium glass can be found in pressed glass beads and cabochons. Often art deco. Sometimes referred to as molded glass. Sometimes mistakenly referred to as carved glass.",
    "category": "Types of glass"
  },
  {
    "term": "Aurora Borealis / AB Glass",
    "def": "An iridescent coating on glass gems “which shimmers in every color of the rainbow”.  Faceted stones and beads with this finish change color from different angles, creating a sense of movement. AB stone scan help date a piece as they were invented in 1955.",
    "category": "Types of glass"
  },
  {
    "term": "Lampwork",
    "def": "Glass beads that are made by hand by a glassblower using thin glass rods and a torch.",
    "category": "Types of glass"
  },
  {
    "term": "Fire polished beads",
    "def": "Faceted glass beads that are made by pouring molten glass into molds and then heat tumbling the rough edges off. The facets are not as sharp as machine cut beads.",
    "category": "Types of glass"
  },
  {
    "term": "Machine cut beads",
    "def": "Faceted beads that are given their final shape by machine grinding/polishing so that the edges of each facet are sharp. This makes the bead more sparkly than fire polished.",
    "category": "Types of glass"
  },
  {
    "term": "Cabochon",
    "def": "A gem of any material that has been rounded and polished as a dome rather than faceted. It has a convex face and a flat back. The art of cutting cabochons is called lapidary.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Faceted",
    "def": "A material is faceted when it is cut to reflect light. A typical diamond is faceted. Glass can be faceted as well. Each cut on a gem is referred to as a facet except the top cut which is a table. A faceted piece can have anywhere from a handful to hundreds of facets.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Table",
    "def": "The top facet of a gem.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Rhinestone",
    "def": "A faceted glass gem. They can be faceted by mold, by tumbling or by machine polishing/cutting or any combination of those three. Often backed with a mirrored silvering and foil to increase the light reflection in the gem.",
    "sub": [
      {
        "label": "machine cut",
        "text": "a rhinestone with all sharp edged facets that are ground/polished by machine. This is the highest quality of rhinestone. These are very sparkly."
      },
      {
        "label": "TTC or table cut",
        "text": "a rhinestone that is made in a mold and only the table (top facet) is machine cut. These are usually good quality stones."
      },
      {
        "label": "Demi-fin",
        "text": "literally meaning half finished - it is the same as TTC above but usually only used when referring to round stones"
      },
      {
        "label": "Fire Polished",
        "text": "molded glass that has been heat tumbled to remove rough edges. The lowest quality of glass rhinestone."
      }
    ],
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Paste / Paste glass / paste stones",
    "def": "Glass that is hand-faceted.",
    "category": "Types of glass"
  },
  {
    "term": "Rivière",
    "def": "A necklace that is comprised of gems of the same species that are all the same size and shape or graduate smoothly in size. Can be paste glass or gemstones.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Gem",
    "def": "Short for gemstone, but can also be used to refer to materials faceted, cut, or polished to look like gemstones, including glass. Example - uranium glass gem.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Stone",
    "def": "A hard material made of rock. In jewelry, is short for gemstone or semi-precious stone, but can also be used to describe a faceted or cabochon material in a piece of jewelry. When referring to \"stones\" in jewelry that aren't actual gemstone, it is preferable to prep the term with the actual material i.e. \"glass stone\" to avoid confusion.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Gemstone",
    "def": "A gemstone is different from glass as it is grown either naturally or in a lab, whereby glass is raw materials melted together.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Natural gemstone",
    "def": "A gemstone grown naturally in the earth and mined.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Synthetic gemstone",
    "def": "A gemstone grown in a lab with heat and pressure. They are physically identical to their natural counterparts. Only a gemologist can tell the difference. Also referred to as lab-created gemstone.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Simulated or imitation gemstone",
    "def": "Typically made of plastics, glass, resin, and dyes, these substances are used to imitate the color, shape or look of a natural gemstone. \"Simulated peridot\" may be glass and could be uranium if so.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Crystal (Rock)",
    "def": "Rock crystal is transparent quartz - usually colorless.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Crystal (Glass)",
    "def": "Glass that contains a high percentage of lead or other additives to create exceptional clarity. Swarovski and Waterford are two examples of glass crystal manufacturers. It can be used to make glassware, rhinestones, and even camera lenses and scopes.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Hardness / Mohs scale",
    "def": "A gem's ability to withstand scratching and abrasion measured by the Mohs scale of mineral hardness. The harder the stone the more it can resist being scratched. Stones that rank high in hardness can only scratch stones that are of equal or less hardness. Diamond ranks the highest gemstone with a 10 on the Mohs scale of hardness. Glass ranks 5.5 - 7. Most gemstones used in jewelry rank somewhere between the two.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Gemologist",
    "def": "A professional certification given to those who have completed the graduate gemologist course at the Gemological Institute of America. A graduate gemologist is trained to identify hundreds of gemstones and detect the latest treatments and synthetics.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Refractive Index / RI",
    "def": "In gemology, it is one of the chief means of identifying a gemstone. It is measured using a refractometer.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Precious / Semi-precious",
    "def": "Precious stones are distinguished by their quality, their rarity and the beauty of their colours. There are only four precious stones: diamond, sapphire, ruby and emerald. All other stones are therefore called semi-precious stones.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Diamond",
    "def": "A precious stone consisting of a clear and colorless crystalline form of pure carbon, the hardest naturally occurring substance. Some diamonds can fluoresce different colors including green.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Spinel",
    "def": "A type of gemstone prized by collectors for it's fluorescence. Natural pink spinels will fluoresce pink. Synthetic spinels that are green, aqua, and teal will fluoresce green exactly like uranium glass. They are more durable than uranium glass and therefore are preferred by some that want a uranium glass ring but are hard on their jewelry. More often found in precious metals. Gold jewelry featuring spinels is often mislabeled as uranium glass.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Corundum",
    "def": "The second hardest gemstone after diamond. The corundum family includes rubies and sapphires. These gemstones can fluoresce a pink red color due to their chromium content. Some sapphires can fluoresce orange and yellow.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Pearls",
    "def": "A hard, glistening object produced within the soft tissue of a living shelled mollusk and used in jewelry. Pearls in costume jewelry are made of glass or plastic. They will \"glow\" blue but it is the reflection of the blacklight. However, some glass pearls can be made of uranium glass and will glow a green distinctive from the blue. They are not common.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Topaz",
    "def": "A type of gemstone that is not fluorescent on it's own, but sometimes can become so after being irradiated as a color treatment. Topaz color glass can sometimes be uranium glass, but if so it generally has a subdued glow due to the dark color of the glass.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Citrine",
    "def": "A type of gemstone that is not fluorescent. Citrine is a color of glass that can be uranium, however, it has the curious property of not always glowing under a blacklight despite being uranium glass and measuring radioactivity.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Peridot",
    "def": "A gemstone that is not fluorescent. Lots of faceted uranium glass gems were made as an imitation of peridot.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Cubic Zirconia",
    "def": "A colorless form of zirconia made to be an inexpensive imitation of a diamond. Pale pink cubic zirconias can glow green under a blacklight and be mistaken for uranium glass.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Acrylic",
    "def": "Transparent plastic with high clarity often used to make very inexpensive faux gems. Can glow green under a blacklignt and be mistaken for uranium glass. Can be scratched with a sharp pin whereas glass cannot.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Resin",
    "def": "A two part polymer plastic material that is often used to make simulated gems. Can glow green under a blacklignt and be mistaken for uranium glass. Can be scratched with a sharp pin whereas glass cannot.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Carat",
    "def": "One of the 4 C's related to the value and quality of diamond grading. Carat weight is the measurement applied to diamonds, precious gemstones, and pearls. Does not apply to glass gems.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Emerald cut",
    "def": "A gem cut in a rectangular shape with stepped facets.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Marquise cut / navette",
    "def": "A gem cut into oval shape meeting in pointed ends, resembling the hull of a ship.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Princess cut",
    "def": "A square cut gem.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Asscher cut",
    "def": "A step cut gem that is essentially an emerald cut but it is square and features cropped corners. It was originally designed and introduced in 1902 by Joseph Asscher.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Baguette",
    "def": "A narrow rectangular cut gem.",
    "category": "Gems, stones & cuts"
  },
  {
    "term": "Brooch",
    "def": "An ornamental piece of jewelry fastened to the clothing with a hinged pin that has a catch.",
    "category": "Findings & construction"
  },
  {
    "term": "Dress clip",
    "def": "Dress clips are a type of brooch. What makes them distinct from a typical brooch is their fastening. Clip-backed brooches can come in two varieties; one with a hinged clip, and another featuring two-sided grips, allowing the brooch to attach more like a claw. Tends to come in pairs.",
    "category": "Findings & construction"
  },
  {
    "term": "Findings",
    "def": "Functional jewelry parts such as clasps, links and settings.",
    "category": "Findings & construction"
  },
  {
    "term": "Clasp",
    "def": "The device used to fasten a necklace, bracelet, or brooch. It can be many styles - spring ring, lobster, barrel, hook and eye, magnetic, etc. Unless it has been replaced, the clasp is the best way to date a piece of jewelry.",
    "links": [
      "https://www.realorrepro.com/article/Dating-brooch-fasteners",
      "https://www.myclassicjewelry.com/blog/vintage-jewelry-hardware/"
    ],
    "category": "Findings & construction"
  },
  {
    "term": "Cameo",
    "def": "In jewelry, a cabochon in relief, usually the profile of a woman but can also have figurals. Most notably made of carved shell, but can be made of any material including glass. Uranium glass cameos are extremely sought-after.",
    "category": "Findings & construction"
  },
  {
    "term": "Intaglio",
    "def": "An intaglio is a recessed image that has been carved into the back of a stone. It is the opposite of a cameo. Glass intaglios are common and some can be uranium glass.",
    "category": "Findings & construction"
  },
  {
    "term": "Cast",
    "def": "The process of making metal jewelry that involves pouring molten metal into a mold which is then polished and refined.",
    "category": "Findings & construction"
  },
  {
    "term": "Stamping",
    "def": "The process of adding decoration (or other visual elements like letters or hallmarks) that is done by striking a tool with that design into the metal. This can be done by hand or by machine. Lots of vintage Czech uranium glass jewelry pieces are made of stamped brass, where thin sheets of brass were die struck in beautiful filigree patterns.",
    "category": "Findings & construction"
  },
  {
    "term": "Filigree",
    "def": "An ornate style of metalwork where fine threads of metal are arranged and curled into intricate designs and soldered into a piece of jewelry. Modern filigree work can also be done by machine.",
    "category": "Findings & construction"
  },
  {
    "term": "Riveting",
    "def": "Riveting is a procedure used in jewelry to join two objects together by making a small hole in each object and then connecting them with a pin or screw that's composed of the same material as the two pieces being joined together. Riveting can be seen on the reverse of a piece of jewelry and can help date the piece - riveting wasn't used in jewelry until after WWII.",
    "category": "Findings & construction"
  },
  {
    "term": "Repoussè",
    "def": "Metal hammered into relief from the reverse side. Chasing or embossing is a similar technique in which the piece is hammered on the front side, sinking the metal. The two techniques are often used in conjunction.",
    "category": "Findings & construction"
  },
  {
    "term": "Etching",
    "def": "A method of using chemicals or tools to cut a design or pattern into a surface.",
    "category": "Findings & construction"
  },
  {
    "term": "Setting",
    "def": "A piece of jewelry that is complete except for the stones.",
    "category": "Findings & construction"
  },
  {
    "term": "Mount / Mounting / Semi-mount",
    "def": "Interchangeable with setting; can also mean just the part of the setting that holds the stone.",
    "category": "Findings & construction"
  },
  {
    "term": "Prong set",
    "def": "Prong setting or prong mount refers to the use of metal projections or tines, called prongs, to secure a gemstone to a piece of jewelry",
    "category": "Findings & construction"
  },
  {
    "term": "Bezel",
    "def": "A setting where the stone is completely surrounded by a precious metal rim and locked into place once the bezel is soldered.",
    "category": "Findings & construction"
  },
  {
    "term": "Shank",
    "def": "The band of a ring that encircles the finger",
    "category": "Findings & construction"
  },
  {
    "term": "Base metal / costume metal",
    "def": "An inexpensive metal used in costume jewelry. Brass, aluminum, stainless steel, titanium, pewter, bronze, and copper are the most common, but other alloys are used as well. Sometimes these materials will be plated with finer metals.",
    "category": "Metals"
  },
  {
    "term": "Silver-plated",
    "def": "A base metal that has been coated in a layer of pure or sterling silver. There is no requirement for the thickness of the layer.",
    "category": "Metals"
  },
  {
    "term": "Sterling silver",
    "def": "A high quality silver alloy that contains 92.5 percent pure silver with its remaining 7.5 percent coming from other metal alloys. Often known as “925” silver. This number is used in hallmarking sterling jewelry.",
    "category": "Metals"
  },
  {
    "term": "Fine silver",
    "def": "99.9% pure silver. Not used in jewelry anywhere near as much as sterling silver. Popular in mid-century modernist pieces.",
    "category": "Metals"
  },
  {
    "term": "800 silver",
    "def": "A relatively mid-high grade of silver that contains 80 percent pure silver and 20 percent other alloy.",
    "category": "Metals"
  },
  {
    "term": "Alpaca silver",
    "def": "Alpaca silver also known as German silver, nickel silver and Argentan is a metal that actually contains no silver at all. It has the appearance of silver but is made with copper, nickel, and zinc.",
    "category": "Metals"
  },
  {
    "term": "Gold filled / rolled gold",
    "def": "Base metal such as brass or copper that has been coated with a thick layer of gold - much thicker than plating or vermeil. Common in vintage jewelry.",
    "category": "Metals"
  },
  {
    "term": "Vermeil",
    "def": "Gold plating over high quality silver (fine or sterling) that is at least 2.5 microns thick.",
    "category": "Metals"
  },
  {
    "term": "Gold-plated",
    "def": "A base metal such as brass or copper that has been coated in a layer of gold. It can be 10, 12, 14, 18, or 24 karat plated. There is no requirement for the thickness of the layer.",
    "category": "Metals"
  },
  {
    "term": "Yellow gold",
    "def": "The natural color of gold. The higher the karat, the more yellow the gold.",
    "category": "Metals"
  },
  {
    "term": "White gold",
    "def": "Gold mixed with alloys to give it a white color. How white the alloy is depends on the metals used and the proportions in which they are added. Some white gold is still yellow and needs to be rhodium plated to be white. The rhodium plating will need to be redone periodically after it wears off with wear. White gold made with platinum group alloys, which is more common in vintage white gold, does not need rhodium plated as it will remain its white color.",
    "category": "Metals"
  },
  {
    "term": "Rose Gold",
    "def": "A gold alloy made most often with yellow gold and copper which creates a rosy, pink finish.",
    "category": "Metals"
  },
  {
    "term": "Gold Karat",
    "def": "the unit of measurement that is used for gold. One karat equals 1/24 part of pure gold.",
    "category": "Metals"
  },
  {
    "term": "10k gold",
    "def": "10/24 pure gold and 14/24 metal alloy. This is a very strong form of gold but is lesser quality.",
    "category": "Metals"
  },
  {
    "term": "14k gold",
    "def": "14/24 pure gold and 10/24 metal alloy. This is considered strong and a mid-range quality of gold.",
    "category": "Metals"
  },
  {
    "term": "18k gold",
    "def": "18/24 pure gold and 6/24 metal alloy. This is a high quality gold mixture but is softer and more easily bent.",
    "category": "Metals"
  },
  {
    "term": "22k gold",
    "def": "the closest to pure gold - 22/24 pure gold and only 2/24 alloy. Very soft and malleable and easily bent and misshaped.",
    "category": "Metals"
  },
  {
    "term": "24k gold",
    "def": "Pure gold. Very soft and not often used to make jewelry due to its softness and cost. Jewelry made of 24k gold is considered to be wearable currency around the world.",
    "category": "Metals"
  },
  {
    "term": "Platinum",
    "def": "A dense, precious metal that is silvery white in color. It is highly desirable and much more durable than gold.",
    "category": "Metals"
  },
  {
    "term": "Rhodium",
    "def": "a bright silvery white metal often used as a plating material. It is durable, anti-corrosive, highly reflective and has a high sheen.",
    "category": "Metals"
  },
  {
    "term": "Taxco",
    "def": "An area in Mexico with a long, rich history of silver jewelry making. Taxco artists used uranium glass and green spinels in their jewelry.",
    "category": "Makers & designers"
  },
  {
    "term": "Juliana D&E",
    "def": "A very collectible rhinestone jewelry designer from the 1960s. Some of their pieces feature uranium glass. Their pieces are unsigned and can be identified by specific construction elements and with the help of identification books and websites.",
    "category": "Makers & designers"
  },
  {
    "term": "Ostby Barton",
    "def": "An extremely popular American jewelry designer from the early 20th century. Their pieces are highly collectible. They are known for their beautiful art deco rings, some of which included uranium glass in silver and even gold. Englebert Ostby died on the Titanic.",
    "category": "Makers & designers"
  },
  {
    "term": "Sadie Green",
    "def": "A contemporary jewelery maker who uses vintage findings in their jewelry. They still make uranium glass jewelry and it can be found on their website.",
    "category": "Makers & designers"
  },
  {
    "term": "Hobè",
    "def": "A jewelry designer whose early pieces were unsigned but often feature uranium glass. Very collectible.",
    "category": "Makers & designers"
  }
]

// Сгенерировано scripts/generate.ts — не править руками.
import type { Cell, Clue } from "../puzzle/engine";

export const SOLUTIONS: Record<string, { pos: Cell[]; clues: Clue[] }> = {
 "baggage": {
  "pos": [
   23,
   11,
   9,
   2,
   15
  ],
  "clues": [
   [
    {
     "t": "beside",
     "k": "B"
    }
   ],
   [
    {
     "t": "west",
     "j": 0
    }
   ],
   [
    {
     "t": "row",
     "i": 1
    }
   ],
   [
    {
     "t": "zone",
     "z": "P"
    }
   ],
   [
    {
     "t": "col",
     "i": 0
    }
   ]
  ]
 },
 "platzkart": {
  "pos": [
   16,
   2,
   19,
   35,
   24,
   9
  ],
  "clues": [
   [
    {
     "t": "row",
     "i": 2
    }
   ],
   [
    {
     "t": "north",
     "j": 5
    }
   ],
   [
    {
     "t": "with",
     "j": 1
    }
   ],
   [
    {
     "t": "col",
     "i": 5
    }
   ],
   [
    {
     "t": "zone",
     "z": "П"
    },
    {
     "t": "corner"
    }
   ],
   [
    {
     "t": "on",
     "k": "V"
    }
   ]
  ]
 },
 "kupe": {
  "pos": [
   30,
   17,
   19,
   4,
   8,
   27
  ],
  "clues": [
   [
    {
     "t": "south",
     "j": 5
    }
   ],
   [
    {
     "t": "with",
     "j": 3
    }
   ],
   [
    {
     "t": "beside",
     "k": "Z"
    },
    {
     "t": "corner"
    }
   ],
   [
    {
     "t": "west",
     "j": 1
    }
   ],
   [
    {
     "t": "beside",
     "k": "V"
    },
    {
     "t": "zone",
     "z": "2"
    }
   ],
   [
    {
     "t": "col",
     "i": 3
    }
   ]
  ]
 },
 "restaurant": {
  "pos": [
   9,
   23,
   30,
   1,
   28,
   14
  ],
  "clues": [
   [
    {
     "t": "col",
     "i": 3
    }
   ],
   [
    {
     "t": "rowNorth",
     "j": 4
    }
   ],
   [
    {
     "t": "alone"
    }
   ],
   [
    {
     "t": "zone",
     "z": "Б"
    },
    {
     "t": "corner"
    }
   ],
   [
    {
     "t": "notZone",
     "z": "З"
    }
   ],
   [
    {
     "t": "zone",
     "z": "З"
    },
    {
     "t": "notWith",
     "j": 1
    }
   ]
  ]
 },
 "locomotive": {
  "pos": [
   19,
   31,
   23,
   35,
   1,
   46,
   13
  ],
  "clues": [
   [
    {
     "t": "col",
     "i": 5
    }
   ],
   [
    {
     "t": "beside",
     "k": "D"
    },
    {
     "t": "corner"
    }
   ],
   [
    {
     "t": "notZone",
     "z": "Т"
    }
   ],
   [
    {
     "t": "onlyOn",
     "k": "U"
    }
   ],
   [
    {
     "t": "zone",
     "z": "К"
    },
    {
     "t": "north",
     "j": 6
    }
   ],
   [
    {
     "t": "zone",
     "z": "У"
    },
    {
     "t": "south",
     "j": 1
    }
   ],
   [
    {
     "t": "east",
     "j": 0
    }
   ]
  ]
 }
};

# Palette check (2026-11-08, WCAG 2.x relative-luminance formula, computed in Python)

DARK: text/bg 17.11 · text/surface 15.56 · muted/bg 8.51 · muted/surface 7.74 · model/bg 6.22 · model/surface 5.66 · you/bg 10.29 · you/surface 9.36 · on-model/model 6.22 · on-you/you 10.29 · line-strong/bg 3.80 · line-strong/surface 3.45
LIGHT: text/bg 15.89 · text/surface 17.93 · muted/bg 6.28 · muted/surface 7.09 · model/bg 5.20 · model/surface 5.87 · you/bg 5.73 · you/surface 6.47 · on-model/model 5.97 · on-you/you 6.57 · line-strong/bg 4.00 · line-strong/surface 4.52
All text pairs ≥ 4.5, UI lines ≥ 3.0.

Colour-blind check (Machado 2009 matrices, severity 1.0):
- deuteranopia: vermilion #FF5A36 -> #b2a02f (mustard); ice blue #7CC4FF -> #9ab7fe (blue); lime #B8F24A -> #f6df59 (yellow); mint #5EE0A0 -> #ccc4a4 (beige).
- protanopia: vermilion -> #8a7b30; ice blue -> #abc5ff; lime -> #fee22e; mint -> #ded09c.
Lime and mint land on the same yellow hue as simulated vermilion; ice blue stays on the blue side of the blue-yellow axis that red-green colour blindness preserves. Hence "you" = ice blue.

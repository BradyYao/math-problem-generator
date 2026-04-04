# Papaya Content Taxonomy

This document defines the full K–12 topic hierarchy used across Papaya. Every problem, skill state, and goal is anchored to a node in this tree. The machine-readable version lives in `content/topics/taxonomy.json`.

---

## Structure

Three levels:
1. **Domain** — broadest grouping (e.g., `algebra`)
2. **Strand** — mid-level theme within a domain (e.g., `alg1` = Algebra 1)
3. **Topic Node** — the leaf-level unit used for skill tracking and problem tagging (e.g., `alg1.linear-equations`)

`topic_id` format: `{strand}.{slug}` for leaf nodes, `{domain}` or `{domain}.{strand}` for parent nodes.

Grade bands:
- `k2` — Kindergarten through Grade 2
- `3-5` — Grades 3–5
- `6-8` — Grades 6–8
- `9-12` — Grades 9–12

---

## Domain 1: Number Sense & Operations (`number`)

**Grade bands:** K–8 primary

### Strand: Counting & Cardinality (`number.counting`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `number.counting.count-to-100` | Counting to 100 | k2 |
| `number.counting.compare-numbers` | Comparing numbers (greater/less) | k2 |
| `number.counting.number-patterns` | Number patterns and sequences | k2 |

### Strand: Place Value (`number.place-value`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `number.place-value.tens-ones` | Tens and ones | k2 |
| `number.place-value.hundreds` | Hundreds place | 3-5 |
| `number.place-value.thousands-plus` | Thousands and beyond | 3-5 |
| `number.place-value.decimals` | Decimal place value | 3-5 |

### Strand: Arithmetic Operations (`number.arithmetic`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `number.arithmetic.addition-subtraction` | Addition and subtraction (whole numbers) | k2 |
| `number.arithmetic.multiplication` | Multiplication facts and concepts | 3-5 |
| `number.arithmetic.division` | Division and remainders | 3-5 |
| `number.arithmetic.order-of-operations` | Order of operations (PEMDAS) | 6-8 |
| `number.arithmetic.properties` | Commutative, associative, distributive properties | 3-5 |

### Strand: Fractions (`number.fractions`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `number.fractions.intro` | Understanding fractions (parts of a whole) | 3-5 |
| `number.fractions.equivalent` | Equivalent fractions | 3-5 |
| `number.fractions.compare` | Comparing and ordering fractions | 3-5 |
| `number.fractions.add-subtract` | Adding and subtracting fractions | 3-5 |
| `number.fractions.multiply-divide` | Multiplying and dividing fractions | 6-8 |
| `number.fractions.mixed-numbers` | Mixed numbers and improper fractions | 3-5 |

### Strand: Ratios & Proportional Relationships (`number.ratios`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `number.ratios.intro` | Understanding ratios and rates | 6-8 |
| `number.ratios.unit-rate` | Unit rates | 6-8 |
| `number.ratios.proportions` | Proportions and cross-multiplication | 6-8 |
| `number.ratios.percent` | Percentages | 6-8 |
| `number.ratios.percent-change` | Percent change and error | 6-8 |
| `number.ratios.scale` | Scale drawings and maps | 6-8 |

### Strand: Integers & Rational Numbers (`number.integers`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `number.integers.intro` | Introduction to negative numbers | 6-8 |
| `number.integers.add-subtract` | Adding and subtracting integers | 6-8 |
| `number.integers.multiply-divide` | Multiplying and dividing integers | 6-8 |
| `number.integers.rational` | Rational numbers on the number line | 6-8 |
| `number.integers.absolute-value` | Absolute value | 6-8 |

---

## Domain 2: Algebra (`algebra`)

**Grade bands:** 6–12 primary

### Strand: Expressions & Equations (`algebra.expressions`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `algebra.expressions.variables` | Variables and expressions | 6-8 |
| `algebra.expressions.evaluate` | Evaluating expressions | 6-8 |
| `algebra.expressions.simplify` | Simplifying expressions | 6-8 |
| `algebra.expressions.translate` | Translating words to expressions | 6-8 |

### Strand: Algebra 1 (`algebra.alg1`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `algebra.alg1.linear-equations` | Solving linear equations (one variable) | 6-8 |
| `algebra.alg1.inequalities` | Solving inequalities | 6-8 |
| `algebra.alg1.literal-equations` | Literal equations and formulas | 9-12 |
| `algebra.alg1.linear-systems` | Systems of linear equations | 8-9 |
| `algebra.alg1.linear-systems-3var` | Systems with three variables | 9-12 |
| `algebra.alg1.word-problems` | Linear word problems | 6-8 |
| `algebra.alg1.slope` | Slope and rate of change | 8-9 |
| `algebra.alg1.linear-graphing` | Graphing linear equations | 8-9 |

### Strand: Algebra 2 (`algebra.alg2`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `algebra.alg2.polynomials-add-sub` | Adding and subtracting polynomials | 9-12 |
| `algebra.alg2.polynomials-multiply` | Multiplying polynomials | 9-12 |
| `algebra.alg2.factoring` | Factoring (GCF, trinomials, difference of squares) | 9-12 |
| `algebra.alg2.quadratic-equations` | Solving quadratic equations | 9-12 |
| `algebra.alg2.quadratic-formula` | The quadratic formula and discriminant | 9-12 |
| `algebra.alg2.completing-square` | Completing the square | 9-12 |
| `algebra.alg2.rational-expressions` | Rational expressions (simplify, add, subtract) | 9-12 |
| `algebra.alg2.rational-equations` | Solving rational equations | 9-12 |
| `algebra.alg2.radical-expressions` | Radical expressions and equations | 9-12 |
| `algebra.alg2.complex-numbers` | Complex numbers (intro, arithmetic) | 9-12 |

### Strand: Exponential & Logarithmic (`algebra.explog`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `algebra.explog.exponent-rules` | Exponent rules | 9-12 |
| `algebra.explog.exponential-functions` | Exponential functions and graphs | 9-12 |
| `algebra.explog.logarithms-intro` | Introduction to logarithms | 9-12 |
| `algebra.explog.log-properties` | Properties of logarithms | 9-12 |
| `algebra.explog.exponential-equations` | Solving exponential equations | 9-12 |
| `algebra.explog.log-equations` | Solving logarithmic equations | 9-12 |
| `algebra.explog.growth-decay` | Exponential growth and decay applications | 9-12 |

---

## Domain 3: Functions (`functions`)

**Grade bands:** 8–12 primary

### Strand: Function Fundamentals (`functions.basics`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `functions.basics.definition` | What is a function? (domain, range, notation) | 8-9 |
| `functions.basics.evaluate` | Evaluating functions | 8-9 |
| `functions.basics.composition` | Composition of functions | 9-12 |
| `functions.basics.inverse` | Inverse functions | 9-12 |
| `functions.basics.transformations` | Transformations of functions (shifts, reflections, stretches) | 9-12 |

### Strand: Linear Functions (`functions.linear`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `functions.linear.slope-intercept` | Slope-intercept form | 8-9 |
| `functions.linear.point-slope` | Point-slope form | 8-9 |
| `functions.linear.standard-form` | Standard form | 8-9 |
| `functions.linear.parallel-perpendicular` | Parallel and perpendicular lines | 9-12 |

### Strand: Quadratic Functions (`functions.quadratic`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `functions.quadratic.vertex-form` | Vertex form and the vertex | 9-12 |
| `functions.quadratic.standard-form` | Standard form → vertex conversion | 9-12 |
| `functions.quadratic.graphing` | Graphing parabolas | 9-12 |
| `functions.quadratic.applications` | Quadratic applications (projectiles, area) | 9-12 |

### Strand: Other Functions (`functions.other`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `functions.other.absolute-value` | Absolute value functions and graphs | 9-12 |
| `functions.other.piecewise` | Piecewise functions | 9-12 |
| `functions.other.step` | Step and floor/ceiling functions | 9-12 |
| `functions.other.polynomial-graphs` | Polynomial function behavior and graphs | 9-12 |

### Strand: Trigonometric Functions (`functions.trig`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `functions.trig.right-triangle` | Right triangle trigonometry (SOH-CAH-TOA) | 9-12 |
| `functions.trig.unit-circle` | The unit circle | 9-12 |
| `functions.trig.graphs` | Graphs of sine, cosine, tangent | 9-12 |
| `functions.trig.identities` | Trigonometric identities | 9-12 |
| `functions.trig.inverse` | Inverse trigonometric functions | 9-12 |
| `functions.trig.equations` | Solving trigonometric equations | 9-12 |
| `functions.trig.law-sines-cosines` | Law of sines and cosines | 9-12 |

---

## Domain 4: Geometry (`geometry`)

**Grade bands:** K–12

### Strand: Shapes & Spatial Reasoning (`geometry.shapes`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `geometry.shapes.2d-identify` | Identifying 2D shapes | k2 |
| `geometry.shapes.3d-identify` | Identifying 3D shapes | k2 |
| `geometry.shapes.symmetry` | Lines of symmetry | 3-5 |
| `geometry.shapes.classify-polygons` | Classifying polygons | 3-5 |

### Strand: Measurement — Area & Perimeter (`geometry.area`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `geometry.area.perimeter` | Perimeter of polygons | 3-5 |
| `geometry.area.area-rectangles` | Area of rectangles and squares | 3-5 |
| `geometry.area.area-triangles` | Area of triangles | 6-8 |
| `geometry.area.area-polygons` | Area of other polygons (trapezoids, parallelograms) | 6-8 |
| `geometry.area.circles` | Circumference and area of circles | 6-8 |
| `geometry.area.composite` | Area of composite figures | 6-8 |

### Strand: Angles & Lines (`geometry.angles`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `geometry.angles.intro` | Types of angles (acute, obtuse, right) | 3-5 |
| `geometry.angles.parallel-lines` | Parallel lines and transversals | 6-8 |
| `geometry.angles.triangle-sum` | Triangle angle sum theorem | 6-8 |
| `geometry.angles.exterior` | Exterior angle theorem | 6-8 |
| `geometry.angles.polygon-sum` | Interior angles of polygons | 9-12 |

### Strand: Coordinate Geometry (`geometry.coordinate`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `geometry.coordinate.plotting` | Plotting points on the coordinate plane | 6-8 |
| `geometry.coordinate.distance` | Distance formula | 9-12 |
| `geometry.coordinate.midpoint` | Midpoint formula | 9-12 |
| `geometry.coordinate.slope` | Slope in the coordinate plane | 9-12 |
| `geometry.coordinate.equations-lines` | Equations of lines (review in geometry context) | 9-12 |

### Strand: Triangles (`geometry.triangles`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `geometry.triangles.classify` | Classifying triangles | 6-8 |
| `geometry.triangles.congruence` | Triangle congruence (SSS, SAS, ASA, AAS) | 9-12 |
| `geometry.triangles.similarity` | Triangle similarity (AA, SAS, SSS) | 9-12 |
| `geometry.triangles.pythagorean` | Pythagorean theorem | 6-8 |
| `geometry.triangles.special` | Special right triangles (30-60-90, 45-45-90) | 9-12 |
| `geometry.triangles.midsegment` | Triangle midsegment theorem | 9-12 |

### Strand: Circles (`geometry.circles`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `geometry.circles.parts` | Parts of a circle (radius, chord, diameter, arc) | 6-8 |
| `geometry.circles.central-angles` | Central angles and arcs | 9-12 |
| `geometry.circles.inscribed-angles` | Inscribed angles | 9-12 |
| `geometry.circles.tangents` | Tangent lines | 9-12 |
| `geometry.circles.equations` | Equation of a circle | 9-12 |
| `geometry.circles.sector-arc` | Arc length and sector area | 9-12 |

### Strand: Transformations (`geometry.transformations`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `geometry.transformations.translations` | Translations | 9-12 |
| `geometry.transformations.reflections` | Reflections | 9-12 |
| `geometry.transformations.rotations` | Rotations | 9-12 |
| `geometry.transformations.dilations` | Dilations and scale factor | 9-12 |
| `geometry.transformations.composition` | Composition of transformations | 9-12 |

### Strand: 3D Geometry (`geometry.3d`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `geometry.3d.surface-area` | Surface area of prisms, cylinders, pyramids, cones | 9-12 |
| `geometry.3d.volume` | Volume of prisms, cylinders, pyramids, cones, spheres | 9-12 |
| `geometry.3d.cross-sections` | Cross-sections of 3D figures | 9-12 |

### Strand: Proofs (`geometry.proofs`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `geometry.proofs.two-column` | Two-column proofs | 9-12 |
| `geometry.proofs.paragraph` | Paragraph proofs | 9-12 |
| `geometry.proofs.coordinate` | Coordinate geometry proofs | 9-12 |

---

## Domain 5: Measurement & Data (`measurement`)

**Grade bands:** K–8

### Strand: Measurement (`measurement.measure`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `measurement.measure.length` | Measuring length (standard and metric) | k2 |
| `measurement.measure.time` | Telling time and elapsed time | k2 |
| `measurement.measure.money` | Money and making change | k2 |
| `measurement.measure.weight-capacity` | Weight and capacity | 3-5 |
| `measurement.measure.unit-conversion` | Unit conversions | 3-5 |
| `measurement.measure.temperature` | Temperature conversions | 6-8 |

### Strand: Data & Graphs (`measurement.data`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `measurement.data.read-graphs` | Reading charts, tables, and graphs | 3-5 |
| `measurement.data.mean-median-mode` | Mean, median, mode, range | 3-5 |
| `measurement.data.line-plots` | Line plots and frequency tables | 3-5 |
| `measurement.data.bar-line-graphs` | Bar graphs and line graphs | 3-5 |
| `measurement.data.stem-leaf` | Stem-and-leaf plots | 6-8 |
| `measurement.data.box-plots` | Box-and-whisker plots | 6-8 |
| `measurement.data.scatter-plots` | Scatter plots and trends | 6-8 |

### Strand: Probability (intro) (`measurement.probability`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `measurement.probability.basic` | Basic probability (likely, unlikely, certain) | 3-5 |
| `measurement.probability.simple` | Simple probability as a fraction | 6-8 |
| `measurement.probability.complementary` | Complementary events | 6-8 |
| `measurement.probability.experimental` | Experimental vs. theoretical probability | 6-8 |
| `measurement.probability.counting` | Counting principle (intro) | 6-8 |

---

## Domain 6: Statistics & Probability (`stats`)

**Grade bands:** 9–12

### Strand: Descriptive Statistics (`stats.descriptive`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `stats.descriptive.measures-center` | Measures of center and spread (mean, median, SD) | 9-12 |
| `stats.descriptive.normal-distribution` | The normal distribution and z-scores | 9-12 |
| `stats.descriptive.histograms` | Histograms and frequency distributions | 9-12 |
| `stats.descriptive.correlation` | Correlation and regression lines | 9-12 |
| `stats.descriptive.two-way-tables` | Two-way frequency tables | 9-12 |

### Strand: Probability (`stats.probability`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `stats.probability.conditional` | Conditional probability | 9-12 |
| `stats.probability.independence` | Independent and dependent events | 9-12 |
| `stats.probability.addition-rule` | Addition rule (P(A or B)) | 9-12 |
| `stats.probability.multiplication-rule` | Multiplication rule (P(A and B)) | 9-12 |
| `stats.probability.binomial` | Binomial probability | 9-12 |
| `stats.probability.geometric` | Geometric probability | 9-12 |

### Strand: Statistical Inference (`stats.inference`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `stats.inference.sampling` | Sampling methods and bias | 9-12 |
| `stats.inference.confidence-intervals` | Confidence intervals (intro) | 9-12 |
| `stats.inference.hypothesis-testing` | Hypothesis testing (intro) | 9-12 |

---

## Domain 7: Precalculus & Advanced Topics (`precalc`)

**Grade bands:** 11–12

### Strand: Sequences & Series (`precalc.sequences`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `precalc.sequences.arithmetic` | Arithmetic sequences and series | 9-12 |
| `precalc.sequences.geometric` | Geometric sequences and series | 9-12 |
| `precalc.sequences.sigma-notation` | Sigma notation | 9-12 |
| `precalc.sequences.infinite-series` | Infinite geometric series | 9-12 |

### Strand: Vectors & Matrices (`precalc.linear-algebra`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `precalc.linear-algebra.vectors` | Vector operations (add, subtract, scalar multiply) | 9-12 |
| `precalc.linear-algebra.dot-product` | Dot product and angle between vectors | 9-12 |
| `precalc.linear-algebra.matrices-intro` | Matrix operations (add, subtract, multiply) | 9-12 |
| `precalc.linear-algebra.determinants` | Determinants and inverse matrices | 9-12 |

### Strand: Conic Sections (`precalc.conics`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `precalc.conics.parabolas` | Parabolas in standard form | 9-12 |
| `precalc.conics.ellipses` | Ellipses | 9-12 |
| `precalc.conics.hyperbolas` | Hyperbolas | 9-12 |

### Strand: Limits (intro) (`precalc.limits`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `precalc.limits.concept` | Intuitive concept of a limit | 9-12 |
| `precalc.limits.evaluate` | Evaluating limits algebraically | 9-12 |
| `precalc.limits.continuity` | Continuity and discontinuities | 9-12 |

---

## Domain 8: AMC/Competition Topics (`competition`)

**Grade bands:** 6–12 (AMC 8: 6-8, AMC 10/12: 9-12)

### Strand: Number Theory (`competition.number-theory`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `competition.number-theory.divisibility` | Divisibility rules | 6-8 |
| `competition.number-theory.prime-factorization` | Prime factorization | 6-8 |
| `competition.number-theory.gcd-lcm` | GCD and LCM | 6-8 |
| `competition.number-theory.modular-arithmetic` | Modular arithmetic | 6-8 |
| `competition.number-theory.number-bases` | Different number bases | 9-12 |
| `competition.number-theory.diophantine` | Diophantine equations (linear) | 9-12 |

### Strand: Combinatorics (`competition.combinatorics`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `competition.combinatorics.counting-principle` | Fundamental counting principle | 6-8 |
| `competition.combinatorics.permutations` | Permutations | 6-8 |
| `competition.combinatorics.combinations` | Combinations | 6-8 |
| `competition.combinatorics.pascals-triangle` | Pascal's triangle and binomial theorem | 9-12 |
| `competition.combinatorics.inclusion-exclusion` | Inclusion-exclusion principle | 9-12 |
| `competition.combinatorics.pigeonhole` | Pigeonhole principle | 9-12 |
| `competition.combinatorics.recursion` | Recursive counting | 9-12 |

### Strand: Competition Geometry (`competition.geometry`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `competition.geometry.area-tricks` | Area techniques (shoelace, Pick's theorem) | 9-12 |
| `competition.geometry.advanced-circles` | Power of a point, radical axis | 9-12 |
| `competition.geometry.mass-point` | Mass point geometry | 9-12 |

### Strand: Competition Algebra (`competition.algebra`)
| Topic ID | Name | Grade Band |
|---|---|---|
| `competition.algebra.inequalities` | Classical inequalities (AM-GM, Cauchy-Schwarz) | 9-12 |
| `competition.algebra.polynomial-theory` | Vieta's formulas, polynomial roots | 9-12 |
| `competition.algebra.functional-equations` | Functional equations | 9-12 |

---

## SAT Domain Mappings

| SAT Domain | Papaya Topic IDs |
|---|---|
| **Heart of Algebra** | `algebra.alg1.*`, `functions.linear.*`, `algebra.expressions.*` |
| **Problem Solving & Data Analysis** | `number.ratios.*`, `measurement.data.*`, `stats.descriptive.*` |
| **Passport to Advanced Math** | `algebra.alg2.*`, `functions.quadratic.*`, `functions.basics.*`, `algebra.explog.*` |
| **Additional Topics in Math** | `geometry.coordinate.*`, `geometry.circles.*`, `geometry.triangles.*`, `functions.trig.right-triangle`, `algebra.alg2.complex-numbers`, `precalc.conics.*` |

---

## AMC Domain Mappings

| Exam | Primary Topic IDs |
|---|---|
| **AMC 8** | `number.*`, `algebra.expressions.*`, `algebra.alg1.linear-equations`, `geometry.area.*`, `geometry.angles.*`, `geometry.triangles.pythagorean`, `measurement.probability.*`, `competition.number-theory.divisibility`, `competition.number-theory.gcd-lcm`, `competition.combinatorics.counting-principle` |
| **AMC 10** | All AMC 8 topics + `algebra.alg1.*`, `algebra.alg2.factoring`, `algebra.alg2.quadratic-equations`, `geometry.triangles.*`, `geometry.circles.*`, `competition.number-theory.*`, `competition.combinatorics.*`, `stats.probability.*` |
| **AMC 12** | All AMC 10 topics + `algebra.alg2.*`, `algebra.explog.*`, `functions.*`, `precalc.sequences.*`, `precalc.conics.*`, `competition.algebra.*`, `competition.geometry.*` |

---

## Topic Count Summary

| Domain | Leaf Topics |
|---|---|
| Number Sense & Operations | 26 |
| Algebra | 34 |
| Functions | 23 |
| Geometry | 38 |
| Measurement & Data | 18 |
| Statistics & Probability | 17 |
| Precalculus & Advanced | 17 |
| AMC/Competition | 21 |
| **Total** | **194** |

---

## Notes for Engineers

- The `topics` database table is seeded from `content/topics/taxonomy.json`.
- All `topic_id` values are stable slugs — never rename them after the DB is seeded (problems and skill_states reference them as foreign keys).
- Parent nodes (`number`, `algebra`, `algebra.alg1`) are also rows in the `topics` table with `parent_id` set. Leaf nodes have no children.
- Skill tracking only applies to leaf topic nodes. Parent skill estimates are derived at read time by rolling up child `mu` values.
- When adding new topics in the future, append to this document and the JSON, then run the seed migration.

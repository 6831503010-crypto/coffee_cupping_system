package th.mfu.cupping.service;

import java.math.BigDecimal;

/** SCA-style category totals used by the existing Angular form.
 * Dry/break aroma and intensity descriptors are observations, not scored categories.
 * Each passed cup adds 2 per category; defective cups receive a per-cup penalty.
 */
public final class CoffeeScoreCalculator {
  private CoffeeScoreCalculator() {}

  public static BigDecimal total(BigDecimal aroma, BigDecimal flavor,
      BigDecimal aftertaste, BigDecimal acidity, BigDecimal body,
      BigDecimal balance, BigDecimal overall,
      int passedUniformity, int passedCleanCup, int passedSweetness,
      Integer defectPointsPerCup) {
    if (aroma == null || flavor == null || aftertaste == null || acidity == null ||
        body == null || balance == null || overall == null) return null;
    if (passedUniformity < 0 || passedUniformity > 5 || passedCleanCup < 0 ||
        passedCleanCup > 5 || passedSweetness < 0 || passedSweetness > 5) return null;
    int failed = 5 - passedUniformity;
    if (failed > 0 && defectPointsPerCup == null) return null;
    return aroma.add(flavor).add(aftertaste).add(acidity).add(body)
        .add(balance).add(overall)
        .add(BigDecimal.valueOf(2L * (passedUniformity + passedCleanCup + passedSweetness)))
        .subtract(BigDecimal.valueOf((long) failed * (defectPointsPerCup == null ? 0 : defectPointsPerCup)));
  }
}

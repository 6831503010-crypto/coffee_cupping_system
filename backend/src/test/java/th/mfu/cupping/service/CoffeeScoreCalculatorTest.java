package th.mfu.cupping.service;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;

class CoffeeScoreCalculatorTest {
  private static BigDecimal score(String value) { return new BigDecimal(value); }

  @Test
  void fivePerfectCupsAndSevenSevensEarnSeventyNine() {
    // 7 scored categories x 7 = 49, 3 cup categories x 5 x 2 = 30.
    assertEquals(0, score("79.00").compareTo(CoffeeScoreCalculator.total(
        score("7"), score("7"), score("7"), score("7"), score("7"),
        score("7"), score("7"), 5, 5, 5, null)));
  }

  @Test
  void oneDefectiveCupLosesTwoCupPointsAndTaintPenalty() {
    // One uniformity miss costs 2 category points + 2 taint points.
    assertEquals(0, score("75").compareTo(CoffeeScoreCalculator.total(
        score("7"), score("7"), score("7"), score("7"), score("7"),
        score("7"), score("7"), 4, 5, 5, 2)));
  }

  @Test
  void missingDefectTypeOrScoreHasNoOfficialTotal() {
    assertNull(CoffeeScoreCalculator.total(score("7"), score("7"), score("7"),
        score("7"), score("7"), score("7"), score("7"), 4, 5, 5, null));
    assertNull(CoffeeScoreCalculator.total(null, score("7"), score("7"),
        score("7"), score("7"), score("7"), score("7"), 5, 5, 5, null));
  }
}

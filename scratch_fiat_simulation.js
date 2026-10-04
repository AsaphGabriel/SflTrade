function simulateFiatConversion(flowerPriceUsd, flowerPriceLocal, rawPoints) {
    const fiatMultiplier = (flowerPriceLocal && flowerPriceUsd) ? (flowerPriceLocal / flowerPriceUsd) : 1;
    console.log(`[Config] 1 FLOWER = ${flowerPriceUsd} USD`);
    console.log(`[Config] 1 FLOWER = ${flowerPriceLocal} LOCAL_FIAT`);
    console.log(`[Multiplier] USD to LOCAL_FIAT = ${fiatMultiplier.toFixed(2)}x`);

    return rawPoints.map(d => {
        let p = Number(d.price_usd || 0);
        let converted = p * fiatMultiplier;
        return { original_usd: p, converted_local: converted };
    });
}

const points = [{ price_usd: 0.05 }, { price_usd: 0.06 }, { price_usd: 0.04 }];
const results = simulateFiatConversion(0.05, 0.25, points);

results.forEach((r, i) => {
    console.log(`Point ${i}: ${r.original_usd} USD -> ${r.converted_local.toFixed(3)} LOCAL_FIAT`);
});

if (results[0].converted_local === 0.25) {
    console.log("✅ Math Simulation PASSED: Conversion logic matches active multiplier.");
} else {
    console.error("❌ Math Simulation FAILED.");
    process.exit(1);
}

/**
 * Obtained stage test cards (from `Test Cards + scenarios.csv` where applicable).
 *
 * 3DS redirect (Obtained sandbox rule): CVV **701**, amount **>= 7000 && <= 7999**
 * (we use 7000.00 in 3DS scenarios). Other flows use amount 10.00 and CVV 123 unless overridden.
 */
export type TestCardScenario = {
  id: string;
  label: string;
  brand: string;
  cardNo: string;
  type: string;
  result: string;
  cardholderName?: string;
  amount?: string;
  /** When set, fills the CVV field (3DS scenarios use 701 per Obtained rule). */
  cvv?: string;
  hint?: string;
};

export const TEST_CARD_SCENARIOS: TestCardScenario[] = [
  {
    id: "visa-4444493318246892",
    label: "VISA · Non-3DS · Approved · …6892",
    brand: "VISA",
    cardNo: "4444493318246892",
    type: "Non-3DS",
    result: "Approved",
  },
  {
    id: "visa-4263704637473241",
    label: "VISA · Non-3DS · Approved · …3241",
    brand: "VISA",
    cardNo: "4263704637473241",
    type: "Non-3DS",
    result: "Approved",
  },
  {
    id: "visa-4761261512059089",
    label: "VISA · Non-3DS · Approved · …9089",
    brand: "VISA",
    cardNo: "4761261512059089",
    type: "Non-3DS",
    result: "Approved",
  },
  {
    id: "mc-5221744250525131",
    label: "MASTERCARD · Non-3DS · Approved · …5131",
    brand: "MASTERCARD",
    cardNo: "5221744250525131",
    type: "Non-3DS",
    result: "Approved",
  },
  {
    id: "mc-5333378415223095",
    label: "MASTERCARD · Non-3DS · Approved · …3095",
    brand: "MASTERCARD",
    cardNo: "5333378415223095",
    type: "Non-3DS",
    result: "Approved",
  },
  {
    id: "mc-5413037340736315",
    label: "MASTERCARD · Non-3DS · Approved · …6315",
    brand: "MASTERCARD",
    cardNo: "5413037340736315",
    type: "Non-3DS",
    result: "Approved",
  },
  {
    id: "visa-4916562347530945",
    label: "VISA · Non-3DS · Declined · …0945",
    brand: "VISA",
    cardNo: "4916562347530945",
    type: "Non-3DS",
    result: "Declined",
  },
  {
    id: "visa-4000195795445766",
    label: "VISA · Non-3DS · Declined · …5766",
    brand: "VISA",
    cardNo: "4000195795445766",
    type: "Non-3DS",
    result: "Declined",
  },
  {
    id: "mc-5168723718989159",
    label: "MASTERCARD · Non-3DS · Declined · …9159",
    brand: "MASTERCARD",
    cardNo: "5168723718989159",
    type: "Non-3DS",
    result: "Declined",
  },
  {
    id: "mc-5470713299676435",
    label: "MASTERCARD · Non-3DS · Declined · …6435",
    brand: "MASTERCARD",
    cardNo: "5470713299676435",
    type: "Non-3DS",
    result: "Declined",
  },
  {
    id: "visa-4000020951595032-3ds",
    label: "VISA · 3DS · Approved · …5032 (CVV 701, amount 7000)",
    brand: "VISA",
    cardNo: "4000020951595032",
    type: "3DS",
    result: "Approved",
    cardholderName: "FL-BRW1",
    amount: "7000.00",
    cvv: "701",
    hint: "Obtained 3DS redirect: CVV 701 and amount between 7000 and 7999 (inclusive). Name on card FL-BRW1 per CSV.",
  },
  {
    id: "visa-2221008123677736-3ds",
    label: "VISA · 3DS · Approved · …7736 (CVV 701, amount 7500)",
    brand: "VISA",
    cardNo: "2221008123677736",
    type: "3DS",
    result: "Approved",
    cardholderName: "CL-BRW2",
    amount: "7500.00",
    cvv: "701",
    hint: "Same 3DS rule: CVV 701, amount in 7000–7999 (example 7500). Name on card CL-BRW2 per CSV.",
  },
];

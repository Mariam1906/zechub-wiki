/**
 * Interpret receivers decoded by the in-browser Zcash WASM parser.
 *
 * Only call these helpers AFTER WASM has validated the original address.
 * Prefixes alone are never proof of a valid or spendable payment address.
 * References: ZIP 229, ZIP 316, ZIP 320, ZIP 326.
 */
export interface DecodedAddressReceivers {
  p2pkh: string | null;
  p2sh: string | null;
  sapling: string | null;
  orchard: string | null;
  tex: string | null;
}

export type AddressPrivacyClass =
  | 'shielded-only'
  | 'mixed'
  | 'transparent-only'
  | 'unknown';

export interface AddressGuidance {
  privacyClass: AddressPrivacyClass;
  classificationLabel: string;
  summary: string;
  receivingGuidance: string[];
  warnings: string[];
}

/**
 * Some parsers expose component receivers for UAs but do not populate them
 * for standalone, WASM-validated addresses. Fill only those standalone kinds
 * that are unambiguously encoded in the validated address itself.
 */
export function completeStandaloneReceivers(
  address: string,
  decoded: DecodedAddressReceivers,
): DecodedAddressReceivers {
  const result = { ...decoded };
  if (address.startsWith('t1') || address.startsWith('tm')) {
    result.p2pkh ||= address;
  } else if (address.startsWith('t3') || address.startsWith('t2')) {
    result.p2sh ||= address;
  } else if (address.startsWith('zs1') || address.startsWith('ztestsapling1')) {
    result.sapling ||= address;
  } else if (address.startsWith('tex1') || address.startsWith('textest1')) {
    result.tex ||= address;
  }
  return result;
}

const present = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.length > 0;

export function getAddressGuidance(
  receivers: DecodedAddressReceivers,
): AddressGuidance {
  const orchard = present(receivers.orchard);
  const sapling = present(receivers.sapling);
  const tex = present(receivers.tex);
  const transparent = present(receivers.p2pkh) || present(receivers.p2sh) || tex;
  const shielded = orchard || sapling;

  let privacyClass: AddressPrivacyClass;
  if (shielded && transparent) privacyClass = 'mixed';
  else if (shielded) privacyClass = 'shielded-only';
  else if (transparent) privacyClass = 'transparent-only';
  else privacyClass = 'unknown';

  const labels: Record<AddressPrivacyClass, string> = {
    'shielded-only': 'Shielded-only',
    mixed: 'Mixed (shielded + transparent)',
    'transparent-only': 'Transparent-only',
    unknown: 'Receiver support unknown',
  };
  const summaries: Record<AddressPrivacyClass, string> = {
    'shielded-only':
      'This address has a shielded receiver without a transparent receiver. A compatible sending wallet can use a shielded payment route.',
    mixed:
      'This address has both shielded and transparent receivers. Payment privacy depends on which receiver the sending wallet chooses.',
    'transparent-only':
      'This address has no shielded receiver. Payments made to it are transparent, not shielded.',
    unknown:
      'This parser could not identify a supported receiver. Do not infer shielded-payment support.',
  };

  const receivingGuidance: string[] = [];
  if (orchard) {
    receivingGuidance.push(
      'Orchard-protocol receiver: after NU6.3, compatible wallets can direct payments to this existing receiver into the Ironwood shielded pool. Ironwood does not introduce a separate address encoding.',
    );
  }
  if (sapling) {
    receivingGuidance.push(
      'Sapling receiver: supports Sapling shielded payments in compatible wallets. A Sapling receiver alone does not indicate Ironwood support.',
    );
  }
  if (shielded) {
    receivingGuidance.push(
      'Actual payment support and receiver selection depend on the sending wallet. A decoded address does not guarantee how a payment will be routed.',
    );
  }
  if (tex) {
    receivingGuidance.push(
      'TEX is a transparent-source-only receiving address (ZIP 320), not a shielded receiver. This restriction does not make its payments private.',
    );
  }

  const warnings: string[] = [];
  if (transparent) {
    warnings.push(
      'Transparent receiver present: if a sender uses it, transaction details are visible publicly on-chain. Use a supported shielded receiver for greater privacy.',
    );
  }
  if (privacyClass === 'unknown') {
    warnings.push(
      'Receiver support is unknown to this decoder version. Confirm compatibility in a trusted wallet before sending funds.',
    );
  }
  return {
    privacyClass,
    classificationLabel: labels[privacyClass],
    summary: summaries[privacyClass],
    receivingGuidance,
    warnings,
  };
}

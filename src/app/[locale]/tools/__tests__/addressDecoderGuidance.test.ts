import {
  completeStandaloneReceivers,
  getAddressGuidance,
  type DecodedAddressReceivers,
} from '../addressDecoderGuidance';

const none: DecodedAddressReceivers = {
  p2pkh: null,
  p2sh: null,
  sapling: null,
  orchard: null,
  tex: null,
};
const receiver = (partial: Partial<DecodedAddressReceivers>) => ({ ...none, ...partial });

describe('post-NU6.3 receiver interpretation', () => {
  it('classifies Orchard-only as shielded and explains Ironwood', () => {
    const guidance = getAddressGuidance(receiver({ orchard: 'u1orchard' }));
    expect(guidance.privacyClass).toBe('shielded-only');
    expect(guidance.receivingGuidance.join(' ')).toContain('Ironwood');
    expect(guidance.warnings).toEqual([]);
  });

  it('does not claim that Sapling alone supports Ironwood', () => {
    const guidance = getAddressGuidance(receiver({ sapling: 'zs1sapling' }));
    expect(guidance.privacyClass).toBe('shielded-only');
    expect(guidance.receivingGuidance.join(' ')).toContain('does not indicate Ironwood');
  });

  it('warns for a mixed Orchard and transparent receiver set', () => {
    const guidance = getAddressGuidance(receiver({ orchard: 'u1orchard', p2pkh: 't1' }));
    expect(guidance.privacyClass).toBe('mixed');
    expect(guidance.warnings[0]).toContain('Transparent receiver present');
  });

  it('handles a Sapling and transparent P2SH mix', () => {
    expect(getAddressGuidance(receiver({ sapling: 'zs1', p2sh: 't3' })).privacyClass)
      .toBe('mixed');
  });

  it.each([
    [{ p2pkh: 't1' }, 'transparent-only'],
    [{ p2sh: 't3' }, 'transparent-only'],
    [{ tex: 'tex1' }, 'transparent-only'],
  ] as const)('classifies transparent receiver combinations', (input, expected) => {
    expect(getAddressGuidance(receiver(input)).privacyClass).toBe(expected);
  });

  it('explains the TEX restriction without suggesting it is shielded', () => {
    const guidance = getAddressGuidance(receiver({ tex: 'tex1' }));
    expect(guidance.receivingGuidance.join(' ')).toContain('transparent-source-only');
    expect(guidance.warnings).toHaveLength(1);
  });

  it('preserves unknown receiver cases instead of inventing privacy assurances', () => {
    const guidance = getAddressGuidance(none);
    expect(guidance.privacyClass).toBe('unknown');
    expect(guidance.warnings).toHaveLength(1);
  });

  it.each([
    ['t1mainnet', 'p2pkh'],
    ['tmtestnet', 'p2pkh'],
    ['t3mainnet', 'p2sh'],
    ['t2testnet', 'p2sh'],
    ['zs1mainnet', 'sapling'],
    ['ztestsapling1testnet', 'sapling'],
    ['tex1mainnet', 'tex'],
    ['textest1testnet', 'tex'],
  ] as const)('recovers a standalone %s receiver after validation', (addr, key) => {
    expect(completeStandaloneReceivers(addr, none)[key]).toBe(addr);
  });

  it('does not manufacture receivers for a UA or unsupported encoding', () => {
    expect(completeStandaloneReceivers('u1unified', none)).toEqual(none);
    expect(completeStandaloneReceivers('zu1newer', none)).toEqual(none);
  });

  it('preserves source data without mutating the WASM result', () => {
    const frozen = Object.freeze(receiver({ orchard: 'u1orchard' }));
    expect(completeStandaloneReceivers('u1encoded', frozen).orchard).toBe('u1orchard');
    expect(frozen.p2pkh).toBeNull();
  });
});

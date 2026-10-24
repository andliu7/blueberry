"""
The check behind the three u3-sequencing synthesis gaps in
src/game/beats/synthesis/corpus.ts (syn-u3-acyl-then-nitrate,
syn-u3-bromo-aniline, syn-u3-nitro-acid).

Run:  python scripts/u3_synthesis_gaps.py
Prints OK, or the first route or name that disagrees, and exits 1.

The corpus is hand-authored TypeScript, so this script writes nothing. It runs
every route and every wrong chip's product through scripts/u3_pools.py's own
model (the same directing rules, reaction edits and Friedel-Crafts failure
convention that key the Unit 3 pools, all canonicalised by RDKit) and reads
every name shown in those gaps back through OPSIN. Change a gap, change this.
"""

from __future__ import annotations

import sys

import u3_pools as u


def name(n: str) -> str:
    return u.canon(u.opsin_smiles(n))


def check(label: str, ok: bool) -> None:
    if not ok:
        print(f"FAILED: {label}")
        sys.exit(1)


def main() -> int:
    bz, tol = name("benzene"), name("toluene")

    # syn-u3-acyl-then-nitrate: benzene, [CH3COCl, AlCl3], acetophenone, HNO3/H2SO4, target
    target = name("1-(3-nitrophenyl)ethan-1-one")
    check("acylating benzene gives acetophenone", u.eas_major(bz, "Ac") == [name("acetophenone")])
    check("nitrating acetophenone gives the meta target", u.eas_major(name("acetophenone"), "NO2") == [target])
    check("acylate, then nitrate reaches it", u.route_gives(bz, ["acylate", "nitrate"], target))
    check("nitrate, then acylate does not", not u.route_gives(bz, ["nitrate", "acylate"], target))
    check("chip nitrate builds nitrobenzene, where Friedel-Crafts fails",
          u.eas_major(bz, "NO2") == [name("nitrobenzene")] and u.eas_fails(name("nitrobenzene")))
    check("chip ethyl builds ethylbenzene", u.canon(u.fc_alkylation(bz, "CCCl")) == name("ethylbenzene"))
    check("ethylbenzene nitrates ortho and para, not meta",
          name("1-ethyl-3-nitrobenzene") not in u.eas_major(name("ethylbenzene"), "NO2"))
    check("chip bromo builds bromobenzene", u.eas_major(bz, "Br") == [name("bromobenzene")])

    # syn-u3-bromo-aniline: benzene, HNO3/H2SO4, nitrobenzene, [Br2, FeBr3], 1-bromo-3-nitrobenzene, Sn/HCl, target
    nb, mbn = name("nitrobenzene"), name("1-bromo-3-nitrobenzene")
    check("nitrating benzene gives nitrobenzene", u.eas_major(bz, "NO2") == [nb])
    check("brominating nitrobenzene goes meta", u.eas_major(nb, "Br") == [mbn])
    check("reducing gives 3-bromoaniline", u.canon(u.reduce_nitro(mbn)) == name("3-bromoaniline"))
    check("chip cl builds 1-chloro-3-nitrobenzene", u.eas_major(nb, "Cl") == [name("1-chloro-3-nitrobenzene")])
    check("1-chloro-3-nitrobenzene reduces to 3-chloroaniline",
          u.canon(u.reduce_nitro(name("1-chloro-3-nitrobenzene"))) == name("3-chloroaniline"))
    check("chip reduce builds aniline", u.canon(u.reduce_nitro(nb)) == name("aniline"))
    check("chip nbs: nitrobenzene has no benzylic H", u.benzylic_bromination(nb) is None)

    # syn-u3-nitro-acid: toluene, HNO3/H2SO4, 1-methyl-4-nitrobenzene, [KMnO4], target
    pnt = name("1-methyl-4-nitrobenzene")
    check("nitrating toluene gives the para product among the majors", pnt in u.eas_major(tol, "NO2"))
    check("KMnO4 gives 4-nitrobenzoic acid", u.canon(u.benzylic_oxidation(pnt)) == name("4-nitrobenzoic acid"))
    check("COOH first would send NO2 meta",
          u.eas_major(name("benzoic acid"), "NO2") == [name("3-nitrobenzoic acid")])
    check("chip nbs builds 1-(bromomethyl)-4-nitrobenzene",
          u.canon(u.benzylic_bromination(pnt)) == name("1-(bromomethyl)-4-nitrobenzene"))
    check("chip sn builds 4-methylaniline", u.canon(u.reduce_nitro(pnt)) == name("4-methylaniline"))

    print("OK: the three u3-sequencing gaps match the Unit 3 model and OPSIN")
    return 0


if __name__ == "__main__":
    sys.exit(main())

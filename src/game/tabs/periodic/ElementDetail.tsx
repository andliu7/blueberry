/**
 * The selected element's full card, under the table. Every value is PubChem's
 * (see elements.ts); Celsius is converted from PubChem's kelvin. A value PubChem
 * does not have reads "No data" rather than a guess.
 */

import type { ReactNode } from "react";
import { CATEGORY_LABEL, kelvinToCelsius, shortMass, type Element } from "./elements";
import { CATEGORY_COLOUR, PERIODIC_INK, PHASE_LABEL } from "./colours";

function withUnit(value: number | null, unit: string): string {
  return value === null ? "No data" : `${value} ${unit}`;
}

function temperature(kelvin: number | null): string {
  return kelvin === null ? "No data" : `${kelvin} K (${kelvinToCelsius(kelvin)} °C)`;
}

/**
 * PubChem writes "[Ar]4s2 3d10 4p5"; a chemist reads the electron counts as
 * superscripts. Each "4s2" becomes 4s with a raised 2. Text outside the
 * orbitals (the core, "(predicted)") passes through unchanged.
 */
export function Configuration({ text }: { readonly text: string }) {
  if (text === "") return <>No data</>;
  const parts = text.split(/(\d[spdf])(\d+)/);
  // split with two capture groups yields: text, orbital, count, text, orbital, count, ...
  return (
    <>
      {parts.map((part, index) => (index % 3 === 2 ? <sup key={index}>{part}</sup> : part))}
    </>
  );
}

export function ElementDetail({ element }: { readonly element: Element }) {
  const facts: readonly (readonly [string, ReactNode])[] = [
    ["Atomic mass", `${element.mass} u`],
    ["Electronegativity", element.electronegativity === null ? "No data" : `${element.electronegativity} (Pauling)`],
    ["Electron configuration", <Configuration key="configuration" text={element.configuration} />],
    ["Oxidation states", element.oxidationStates || "No data"],
    ["First ionization energy", withUnit(element.ionizationEnergyEv, "eV")],
    ["Electron affinity", withUnit(element.electronAffinityEv, "eV")],
    ["Atomic radius (van der Waals)", withUnit(element.atomicRadiusPm, "pm")],
    ["Standard state", PHASE_LABEL[element.phase]],
    ["Melting point", temperature(element.meltingPointK)],
    ["Boiling point", temperature(element.boilingPointK)],
    ["Density", withUnit(element.densityGPerCm3, "g/cm³")],
    ["Group, period", `${element.group ?? (element.period === 6 ? "La-Lu row" : "Ac-Lr row")}, ${element.period}`],
    ["Discovered", element.yearDiscovered || "No data"],
  ];

  return (
    <section className="pt-detail" aria-live="polite" aria-label={`${element.name} details`}>
      <div className="pt-detail-head">
        <div className="pt-detail-tile" style={{ background: CATEGORY_COLOUR[element.category], color: PERIODIC_INK }}>
          <span className="pt-detail-number">{element.number}</span>
          <span className="pt-detail-symbol">{element.symbol}</span>
          <span className="pt-detail-mass">{shortMass(element.mass)}</span>
        </div>
        <div className="min-w-0">
          <h3 className="pt-detail-name">{element.name}</h3>
          <span className="pt-chip" style={{ background: CATEGORY_COLOUR[element.category], color: PERIODIC_INK }}>
            {CATEGORY_LABEL[element.category]}
          </span>
        </div>
      </div>
      <dl className="pt-facts">
        {facts.map(([term, value]) => (
          <div key={term} className="pt-fact">
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="pt-source">
        Data:{" "}
        <a href={`https://pubchem.ncbi.nlm.nih.gov/element/${element.number}`} target="_blank" rel="noreferrer">
          PubChem, {element.name}
        </a>
      </p>
    </section>
  );
}

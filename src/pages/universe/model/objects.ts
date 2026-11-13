import { both } from '@/shared/i18n'
import type { Text } from '@/shared/i18n'
import { BODIES, BODY_IDS } from './solar/bodies'
import type { BodyId } from './solar/bodies'
import { STARS } from './stars/catalog'
import { GALAXY_OBJECTS } from './galaxy/catalog'
import { LOCAL_GALAXIES } from './local/catalog'
import { COSMIC_STRUCTURES } from './cosmic/catalog'
import type { ScaleId } from './view'

export interface SceneObject {
  id: string
  name: Text
}

const SUN: SceneObject = { id: 'sun', name: both('태양', 'Sun') }

const ALL: Record<ScaleId, SceneObject[]> = {
  solar: BODY_IDS.map((id) => ({ id, name: BODIES[id].name })),
  stars: [SUN, ...STARS.map((s) => ({ id: s.id, name: s.name }))],
  galaxy: GALAXY_OBJECTS.map((o) => ({ id: o.id, name: o.name })),
  local: LOCAL_GALAXIES.map((g) => ({ id: g.id, name: g.name })),
  cosmic: COSMIC_STRUCTURES.map((s) => ({ id: s.id, name: s.name })),
}

const STRIP: Record<ScaleId, string[]> = {
  solar: [
    'sun',
    'mercury',
    'venus',
    'earth',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto',
    'ceres',
    'halley',
    'apophis',
  ] satisfies BodyId[],
  stars: [
    'sun',
    'alpha-centauri',
    'proxima',
    'barnard',
    'sirius',
    'epsilon-eridani',
    'tau-ceti',
    'vega',
    'arcturus',
    'trappist1',
    'gliese710',
    'betelgeuse',
    'rigel',
  ],
  galaxy: GALAXY_OBJECTS.map((o) => o.id),
  local: [
    'milky-way',
    'andromeda',
    'triangulum',
    'lmc',
    'smc',
    'm32',
    'm110',
    'ngc6822',
    'ic1613',
    'ic10',
    'sagittarius-dsph',
    'fornax',
  ],
  cosmic: [
    'local-group',
    'virgo-cluster',
    'local-void',
    'laniakea',
    'great-attractor',
    'perseus-pisces',
    'coma-cluster',
    'shapley',
    'bootes-void',
    'sloan-great-wall',
    'hcb-great-wall',
    'cmb',
  ],
}

export const objectsOf = (scale: ScaleId) => ALL[scale]

export function destinationsOf(scale: ScaleId): SceneObject[] {
  const byId = new Map(ALL[scale].map((o) => [o.id, o]))
  return STRIP[scale]
    .map((id) => byId.get(id))
    .filter((o): o is SceneObject => Boolean(o))
}

export const objectName = (scale: ScaleId, id: string): Text | undefined =>
  ALL[scale].find((o) => o.id === id)?.name

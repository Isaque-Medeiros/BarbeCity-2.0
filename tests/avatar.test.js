import test from 'node:test';
import assert from 'node:assert/strict';
import {
  avatarDeServicos,
  avatarDoServico,
  detectarTraits,
  descreverTraits,
  mesclarTraits,
  precisaCareca,
  traitsPermitidos,
} from '../server/utils/avatar.js';

const SERVICOS = [
  { slug: 'corte', nome: 'Corte', categoria: 'individual', icone: 'scissors' },
  { slug: 'barba', nome: 'Barba', categoria: 'individual', icone: 'razor' },
  { slug: 'sobrancelha', nome: 'Sobrancelha', categoria: 'individual', icone: 'eyebrow' },
  { slug: 'corte-barba', nome: 'Corte + Barba', categoria: 'combo', icone: 'combo' },
  { slug: 'combo-total', nome: 'Corte + Barba + Sobrancelha', categoria: 'combo', icone: 'crown' },
  { slug: 'luzes', nome: 'Luzes', categoria: 'outros', icone: 'highlights' },
  { slug: 'hidratacao-capilar', nome: 'Hidratação Capilar', categoria: 'outros', icone: 'droplet' },
  { slug: 'botox-capilar', nome: 'Botox Capilar', categoria: 'outros', icone: 'flask' },
];

function porSlug(slug) {
  return SERVICOS.find((servico) => servico.slug === slug);
}

test('detecta traços dos serviços do seed', () => {
  assert.equal(detectarTraits(porSlug('corte')).cabelo, true);
  assert.equal(detectarTraits(porSlug('barba')).barba, true);
  assert.equal(detectarTraits(porSlug('sobrancelha')).sobrancelha, true);

  const combo = detectarTraits(porSlug('corte-barba'));
  assert.equal(combo.cabelo, true);
  assert.equal(combo.barba, true);

  assert.equal(detectarTraits(porSlug('luzes')).luzes, true);
  assert.equal(detectarTraits(porSlug('luzes')).cabelo, true);
  assert.equal(detectarTraits(porSlug('hidratacao-capilar')).tratamento, true);
  assert.equal(detectarTraits(porSlug('botox-capilar')).tratamento, true);
});

test('careca é derivado quando só há barba/sobrancelha', () => {
  const barba = avatarDoServico(porSlug('barba'));
  assert.equal(barba.traits.cabelo, false);
  assert.equal(barba.careca, true);
  assert.match(barba.rotulo, /Careca/);
  assert.equal(precisaCareca(barba.traits), true);
});

test('override do painel tem prioridade', () => {
  const traits = detectarTraits({
    slug: 'corte',
    nome: 'Corte',
    icone: 'scissors',
    avatar_traits: { cabelo: false, barba: true, sobrancelha: false, luzes: false, tratamento: false },
  });
  assert.equal(traits.cabelo, false);
  assert.equal(traits.barba, true);
});

test('luzes e tratamento sempre exigem cabelo', () => {
  const traits = traitsPermitidos({ luzes: true });
  assert.equal(traits.cabelo, true);
  const outro = traitsPermitidos({ tratamento: true });
  assert.equal(outro.cabelo, true);
});

test('mescla principal + adicionais', () => {
  const traits = mesclarTraits([porSlug('corte'), porSlug('barba'), porSlug('sobrancelha')]);
  assert.equal(traits.cabelo, true);
  assert.equal(traits.barba, true);
  assert.equal(traits.sobrancelha, true);
  assert.equal(precisaCareca(traits), false);
  assert.match(descreverTraits(traits), /Cabelo/);
});

test('avatar de combo total reúne todos os traços', () => {
  const avatar = avatarDeServicos([porSlug('combo-total')]);
  assert.equal(avatar.traits.cabelo, true);
  assert.equal(avatar.traits.barba, true);
  assert.equal(avatar.traits.sobrancelha, true);
  assert.equal(avatar.careca, false);
});

test('serviço desconhecido cai no visual clássico', () => {
  const avatar = avatarDoServico({ slug: 'novo-servico', nome: 'Novo Serviço', categoria: 'individual' });
  assert.equal(avatar.traits.cabelo, true);
  assert.equal(avatar.rotulo, 'Cabelo');
});

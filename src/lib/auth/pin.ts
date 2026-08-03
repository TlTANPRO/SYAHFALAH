// lib/auth/pin.ts
// PBKDF2-based PIN hashing and verification (pure JS, works on all platforms)

import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto'

const ITERATIONS = 100000
const KEY_LENGTH = 32
const DIGEST = 'sha256'
const SALT_LENGTH = 16

export interface PinHashResult {
  hash: string
  salt: string
}

/**
 * Hash a 4-digit PIN using PBKDF2
 */
export function hashPin(pin: string): PinHashResult {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('PIN must be exactly 4 digits')
  }

  const salt = randomBytes(SALT_LENGTH)
  const hash = pbkdf2Sync(pin, salt, ITERATIONS, KEY_LENGTH, DIGEST)

  return {
    hash: hash.toString('hex'),
    salt: salt.toString('hex'),
  }
}

/**
 * Verify a PIN against a stored hash
 */
export function verifyPin(pin: string, storedHash: string, storedSalt: string): boolean {
  if (!/^\d{4}$/.test(pin)) {
    return false
  }

  const salt = Buffer.from(storedSalt, 'hex')
  const hash = pbkdf2Sync(pin, salt, ITERATIONS, KEY_LENGTH, DIGEST)
  const hashHex = hash.toString('hex')

  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(Buffer.from(hashHex), Buffer.from(storedHash))
  } catch {
    return false
  }
}

/**
 * Generate a random 4-digit PIN
 */
export function generateRandomPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

/**
 * Validate PIN format
 */
export function isValidPinFormat(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}

/**
 * Check if PIN is commonly used (weak)
 */
export function isWeakPin(pin: string): boolean {
  const weakPins = [
    '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
    '1234', '4321', '1122', '2211', '1212', '2121', '7777', '1004', '2000', '2001',
    '1980', '1981', '1982', '1983', '1984', '1985', '1986', '1987', '1988', '1989',
    '1990', '1991', '1992', '1993', '1994', '1995', '1996', '1997', '1998', '1999',
    '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011',
    '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021',
    '2022', '2023', '2024', '2025', '2026',
  ]
  return weakPins.includes(pin)
}
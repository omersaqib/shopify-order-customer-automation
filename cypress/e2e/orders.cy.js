const count = Number(Cypress.expose('count'));
const start = Number(Cypress.expose('start'));
if (!Number.isInteger(count) || count < 1 || count > 101) throw new Error('ORDER_COUNT must be 1–101');
if (!Number.isInteger(start) || start < 1 || start + count - 1 > 101) throw new Error('Only user1 through user101 are allowed in this batch');
const customers = require('../fixtures/customers.json');
const visibleInput = name => cy.get(`input[name="${name}"]:visible`).first();
function fill(name, value) { visibleInput(name).clear().type(value, { delay: 30 }).should('have.value', value).blur(); }

describe('Preloved by Omar — separate COD checkout customers', () => {
  let failed = false;
  beforeEach(function () { if (failed) this.skip(); });
  afterEach(function () { if (this.currentTest.state === 'failed') failed = true; });
  for (let index = start; index < start + count; index++) {
    it(`creates verified COD order ${index} for a unique subscribed customer`, function () {
      const customer = customers[index - 1];
      const email = customer.email;
      cy.task('orderState', index).then(state => {
        if (state?.status === 'confirmed') this.skip();
        if (state?.status === 'submitting') throw new Error(`Order ${index} has an uncertain submission. Check Shopify for ${email} before resetting its journal entry.`);
      });
      // Cypress test isolation gives each customer a clean cookie/storage session.
      cy.visit('/');
      cy.get('body').then($body => {
        if ($body.find('input[name="password"]:visible').length) {
          cy.env(['storefrontPassword']).then(({ storefrontPassword }) => {
            if (!storefrontPassword) throw new Error('Storefront password required: set CYPRESS_storefrontPassword');
            cy.get('input[name="password"]:visible').type(storefrontPassword, { log: false });
            cy.get('form[action*="password"] button[type="submit"]').click();
          });
        }
      });
      // Establish the German market before checkout, rather than changing markets mid-form.
      cy.visit('/?country=DE');
      cy.get('product-card').filter(':has(a[href*="/products/new-balance-574"])').first().within(() => {
        cy.get('button.quick-add__button--choose').click();
      });
      cy.get('dialog[open]').should('be.visible').within(() => {
        cy.get('input[type="radio"]:not(:disabled)').first().check({ force: true });
        cy.contains('button', /Add to cart/).should('be.enabled').click();
      });
      cy.get('dialog[open]').should('not.exist');
      cy.get('button[aria-label="Cart"]').click();
      cy.get('#checkout').should('be.visible').click();
      cy.location('pathname').should('include', '/checkouts/');
      // Wait for checkout hydration: the initial HTML inputs can appear before
      // Shopify attaches the handlers that recalculate delivery and payment.
      cy.get('input[aria-label="Cash on Delivery (COD)"]', { timeout: 60000 }).should('exist');
      fill('email', email);
      cy.get('#marketing_opt_in').check().should('be.checked');
      cy.get('select[name="countryCode"]:visible').select('DE');
      fill('firstName', customer.firstName);
      fill('lastName', customer.lastName);
      fill('address1', 'Musterstrasse 1');
      fill('address2', `QA Test ${index}`);
      fill('postalCode', '10115');
      fill('city', 'Berlin');
      cy.get('input[aria-label="Cash on Delivery (COD)"]', { timeout: 60000 }).check().should('be.checked');
      cy.contains(/Free shipping \(test\)/, { timeout: 45000 }).should('be.visible');
      cy.get('#checkout-pay-button').should('be.enabled');
      if (!Cypress.expose('submit')) {
        cy.screenshot(`ready-${index}`);
        cy.task('recordOrder', { index, email, status: 'ready', payment: 'COD' });
        return;
      }
      // Persist BEFORE clicking. Never automatically retry an ambiguous payment submission.
      cy.task('beforeSubmit');
      cy.url().then(checkoutUrl => cy.task('recordOrder', { index, email, status: 'submitting', checkoutUrl, payment: 'COD' }));
      cy.get('#checkout-pay-button').click();
      cy.contains(/Thank you|Your order is confirmed/i, { timeout: 90000 }).should('be.visible');
      cy.contains(email).should('be.visible');
      cy.contains(`${customer.firstName} ${customer.lastName}`).should('be.visible');
      cy.contains(/Cash on Delivery \(COD\)/).should('be.visible');
      cy.url().then(confirmationUrl => {
        cy.get('body').then($body => {
          const reference = $body[0].innerText.match(/Confirmation\s*#\s*([A-Z0-9-]{5,})/i)?.[0] || null;
          cy.task('recordOrder', { index, email, status: 'confirmed', confirmationUrl, reference });
          cy.task('log', `CONFIRMED ${index}: ${email} ${reference || ''}`);
        });
      });
      cy.screenshot(`confirmed-${index}`);
    });
  }
});

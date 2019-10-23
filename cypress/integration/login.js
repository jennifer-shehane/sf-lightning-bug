
it('load', () => {
  cy.visit(`index.html`)
  cy.contains('Loading').should('not.be.visible')
  cy.get('.slds-badge')
})
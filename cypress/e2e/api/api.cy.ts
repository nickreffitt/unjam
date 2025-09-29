describe('API - Hello World Edge Function', () => {
  const API_BASE_URL = 'http://localhost:8001';

  it('returns hello world message with default name', () => {
    // given the edge function server is running
    // when making a POST request without a name
    cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/hello-world`,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {}
    }).then((response) => {
      // then response is successful
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('message', 'Hello World!');
      expect(response.body).to.have.property('timestamp');
      expect(response.body).to.have.property('environment', 'local');
    });
  });
  
});
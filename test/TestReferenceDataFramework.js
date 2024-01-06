const ReferenceDataFramework = require('..');

module.exports = class TestReferenceDataFramework extends ReferenceDataFramework {

  #nukeCustomObjects;
  #wipeCustomData;

  constructor(config) {
    super(config);
    this.#nukeCustomObjects = config.nukeCustomObjects;
    this.#wipeCustomData = config.wipeCustomData;
  }

  async reset() {
    await this.withTransaction(async (tx) => {
      await this.#nukeCustomObjects(tx);
      await this.#wipeRdfData(tx);
    })
    await this.init();
  }

  async wipe() {
    await this.withTransaction(async (tx) => {
      await this.#wipeCustomData(tx);
      await this.#wipeRdfData(tx);
    })
  }

  async #wipeRdfData(tx) {
    await tx.query('DELETE FROM rdf_notification');
    await tx.query('DELETE FROM rdf_hook');
    await tx.query('DELETE FROM rdf_data_frame');
    await tx.query('DELETE FROM rdf_projection_entity');
    await tx.query('DELETE FROM rdf_entity');
    await tx.query('DELETE FROM rdf_change_set');
    await tx.query('DELETE FROM rdf_projection');
  }
}
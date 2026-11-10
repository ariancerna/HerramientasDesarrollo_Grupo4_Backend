-- Pasarela Culqi: los pagos en línea se registran con el método 'Tarjeta'
-- y el id del cargo de Culqi (chr_...) como código de operación.
alter table pagos drop constraint if exists pagos_metodo_pago_check;
alter table pagos add constraint pagos_metodo_pago_check
  check (metodo_pago in ('Yape', 'Plin', 'Transferencia', 'Efectivo', 'Tarjeta'));

export interface MiConfiguracion {
  tema: 'claro' | 'oscuro' | 'sistema';
  notificacionesSilenciadas: boolean;
}

export interface ConfiguracionUsuarioRow {
  tema: MiConfiguracion['tema'];
  notificaciones_silenciadas: boolean;
}
